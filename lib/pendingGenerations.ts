import { createClient } from "@supabase/supabase-js";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

// Image, video and voice jobs are submitted to Muapi and then polled by the
// user's own browser. That works while someone sits and watches, but the
// server never learns a job finished if they close the app -- which is
// exactly when a notification would be useful. So each job is recorded here
// and Muapi is asked to call /api/webhooks/muapi when it's done.
// See supabase/sql/2026-09-26-pending-generations.sql.
//
// The webhook is keyed on a job id we mint ourselves rather than Muapi's
// request id, because the callback URL has to be built *before* submitting,
// and the request id only comes back in the response. The row is written
// before the job is submitted for the same reason: a fast job could otherwise
// call back before we'd recorded who to notify.

export type GenerationKind = "image" | "video" | "voice";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.yoojel.com").replace(/\/+$/, "");

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// The callback URL is handed to a third party, so it carries a per-job
// signature rather than one shared secret: a leaked token is useless for any
// job but its own. Signed with the service role key, which is server-only.
function sign(jobId: string): string | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createHmac("sha256", key).update(`muapi:${jobId}`).digest("base64url").slice(0, 32);
}

export function verifyWebhookToken(jobId: string, token: string | null): boolean {
  if (!token) return false;
  const expected = sign(jobId);
  if (!expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type OpenedJob = { jobId: string; webhookUrl: string | null };

// Records a job as pending and returns the callback URL to hand to Muapi.
// Best effort throughout: a generation must never fail because the
// notification bookkeeping did -- a null webhookUrl just means no push.
export async function openGenerationJob(params: {
  userId: string;
  userEmail?: string | null;
  kind: GenerationKind;
  prompt?: string | null;
}): Promise<OpenedJob> {
  const jobId = randomUUID();
  const token = sign(jobId);
  const db = admin();
  if (!db || !token) return { jobId, webhookUrl: null };

  const row: Record<string, unknown> = {
    id: jobId,
    user_id: params.userId,
    user_email: params.userEmail ?? null,
    kind: params.kind,
  };

  try {
    const withPrompt = await db
      .from("pending_generations")
      .insert({ ...row, prompt: params.prompt ? params.prompt.slice(0, 2000) : null });
    if (withPrompt.error) {
      // The prompt column arrived in a later migration. If it isn't there yet,
      // fall back to a row without it rather than losing the whole job: no
      // row means no callback URL, which would silently disable notifications
      // and Library persistence entirely.
      const withoutPrompt = await db.from("pending_generations").insert(row);
      if (withoutPrompt.error) return { jobId, webhookUrl: null };
    }
  } catch {
    return { jobId, webhookUrl: null };
  }

  return { jobId, webhookUrl: `${SITE_URL}/api/webhooks/muapi?job=${jobId}&t=${token}` };
}

// Links Muapi's request id to the job once the submit call returns, so the
// browser's own polling can later mark it seen.
export async function attachRequestId(jobId: string, requestId: string): Promise<void> {
  const db = admin();
  if (!db) return;
  try {
    await db.from("pending_generations").update({ request_id: requestId }).eq("id", jobId);
  } catch {
    // Ignore.
  }
}

// The job never started -- drop the row so it can't later be notified about.
export async function abandonGenerationJob(jobId: string): Promise<void> {
  const db = admin();
  if (!db) return;
  try {
    await db.from("pending_generations").delete().eq("id", jobId);
  } catch {
    // Ignore.
  }
}

// The provider's request id for a job, so the webhook can ask Muapi what
// actually happened rather than trusting the callback body's shape.
export async function getJobRequestId(jobId: string): Promise<string | null> {
  const db = admin();
  if (!db) return null;
  try {
    const { data } = await db
      .from("pending_generations")
      .select("request_id")
      .eq("id", jobId)
      .maybeSingle();
    return data?.request_id ?? null;
  } catch {
    return null;
  }
}

// Saves a finished image or video into the Library on the user's behalf.
// Normally the browser does this when its polling sees the job complete, but
// a user who closed the app never gets that far -- and they were charged a
// monthly generation regardless, so the result must not be lost.
export async function saveToLibrary(params: {
  userId: string;
  kind: GenerationKind;
  prompt: string | null;
  url: string;
}): Promise<void> {
  // The Library only holds images and videos; voice has its own storage.
  if (params.kind !== "image" && params.kind !== "video") return;
  const db = admin();
  if (!db) return;
  try {
    await db.from("generations").insert({
      user_id: params.userId,
      kind: params.kind,
      prompt: params.prompt || "(generated while the app was closed)",
      url: params.url,
    });
  } catch {
    // Ignore -- the notification still goes out.
  }
}

// Called when the user's own browser polls a job to completion. Claims the
// row so the webhook, arriving at roughly the same moment, doesn't also push
// a notification for something already on screen.
export async function markGenerationSeen(requestId: string): Promise<void> {
  const db = admin();
  if (!db) return;
  try {
    await db
      .from("pending_generations")
      .update({ status: "seen", resolved_at: new Date().toISOString() })
      .eq("request_id", requestId)
      .eq("status", "pending");
  } catch {
    // Ignore.
  }
}

export type ClaimedGeneration = {
  userEmail: string | null;
  userId: string | null;
  kind: GenerationKind;
  prompt: string | null;
};

// Atomically takes ownership of a job for notification. Returns null when the
// row is missing or already resolved, which makes the webhook idempotent --
// Muapi retries up to three times on any non-2xx.
export async function claimForNotification(
  jobId: string,
  outcome: "notified" | "failed"
): Promise<ClaimedGeneration | null> {
  const db = admin();
  if (!db) return null;

  // Selecting a column the table doesn't have makes PostgREST reject the
  // whole request, so the update never applies and the failure is
  // indistinguishable from "someone else already claimed this". The prompt
  // column arrived in a later migration, so try with it and fall back.
  const claim = (columns: string) =>
    db
      .from("pending_generations")
      .update({ status: outcome, resolved_at: new Date().toISOString() })
      .eq("id", jobId)
      .eq("status", "pending")
      .select(columns)
      .maybeSingle();

  try {
    let { data, error } = await claim("user_email, user_id, kind, prompt");
    if (error) {
      ({ data } = await claim("user_email, user_id, kind"));
    }
    if (!data) return null;
    const row = data as unknown as Record<string, unknown>;
    return {
      userEmail: (row.user_email as string) ?? null,
      userId: (row.user_id as string) ?? null,
      kind: row.kind as GenerationKind,
      prompt: (row.prompt as string) ?? null,
    };
  } catch {
    return null;
  }
}
