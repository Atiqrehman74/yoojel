import { NextRequest } from "next/server";
import { claimForNotification, verifyWebhookToken, type GenerationKind } from "@/lib/pendingGenerations";
import { sendAppilixPush } from "@/lib/appilixPush";

// Muapi calls this when an image, video or voice job finishes, so the person
// who started it can be told even though they closed the app. Authenticated
// by a per-job signature in the query string -- see lib/pendingGenerations.ts.
//
// Muapi retries up to three times on a non-2xx, so this answers 200 for
// anything it has finished reasoning about (including jobs it deliberately
// ignores) and reserves non-2xx for "try me again".

export const runtime = "nodejs";
export const maxDuration = 30;

const COPY: Record<GenerationKind, { done: [string, string]; failed: [string, string]; path: string }> = {
  image: {
    done: ["Your image is ready", "Tap to open it in Image Studio."],
    failed: ["That image didn't generate", "Tap to try again in Image Studio."],
    path: "/apps/image-studio",
  },
  video: {
    done: ["Your video is ready", "Tap to watch it in Video Studio."],
    failed: ["That video didn't generate", "Tap to try again in Video Studio."],
    path: "/apps/video-studio",
  },
  voice: {
    done: ["Your audio is ready", "Tap to listen in Voice Studio."],
    failed: ["That audio didn't generate", "Tap to try again in Voice Studio."],
    path: "/apps/voice-studio",
  },
};

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.yoojel.com").replace(/\/+$/, "");

function ok(note: string) {
  return new Response(JSON.stringify({ ok: true, note }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get("job");
  const token = req.nextUrl.searchParams.get("t");
  if (!jobId || !verifyWebhookToken(jobId, token)) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const payload = await req.json().catch(() => null);
  const status = String((payload as any)?.status || "").toLowerCase();

  // Anything that isn't a terminal state is a progress ping, not a result.
  const succeeded = status === "completed" || status === "succeeded" || status === "success";
  const failed = status === "failed" || status === "error";
  if (!succeeded && !failed) {
    return ok("ignored non-terminal status");
  }

  // Claiming is what makes this idempotent: the row only moves out of
  // 'pending' once, so a retried webhook -- or one racing the user's own
  // browser finishing the job on screen -- won't send a second notification.
  const claimed = await claimForNotification(jobId, succeeded ? "notified" : "failed");
  if (!claimed) {
    return ok("already resolved");
  }
  // Address both the email and the Supabase user id. Appilix stores one
  // identity per device and Yoojel used to record the id before it recorded
  // the email, so a device that hasn't reloaded the site since that change is
  // still registered under the id. Sending to both reaches either, and costs
  // nothing when only one matches.
  const identities = [claimed.userEmail, claimed.userId].filter(
    (v): v is string => typeof v === "string" && v.length > 0
  );
  if (identities.length === 0) {
    return ok("no identity recorded for this job");
  }

  const copy = COPY[claimed.kind] ?? COPY.image;
  const [title, body] = succeeded ? copy.done : copy.failed;

  const result = await sendAppilixPush({
    title,
    body,
    userIdentity: identities,
    openLinkUrl: `${SITE_URL}${copy.path}`,
  });

  // A push failure isn't worth making Muapi retry: the job itself is done and
  // the row is already resolved, so a retry would change nothing.
  return ok(result.ok ? "notified" : `push failed: ${result.error}`);
}
