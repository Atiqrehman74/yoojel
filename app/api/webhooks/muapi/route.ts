import { NextRequest } from "next/server";
import {
  claimForNotification,
  getJobRequestId,
  saveToLibrary,
  verifyWebhookToken,
  type GenerationKind,
} from "@/lib/pendingGenerations";
import { sendAppilixPush } from "@/lib/appilixPush";
import { toDownloadUrl, muapiPoll, muapiOutputUrl } from "@/lib/muapi";

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

  const raw = await req.text().catch(() => "");
  let payload: any = null;
  try {
    payload = JSON.parse(raw);
  } catch {
    // Not JSON -- logged below so the real shape is knowable rather than guessed.
  }

  const status = String(payload?.status || "").toLowerCase();
  console.log(
    `[muapi-webhook] job=${jobId} ct=${req.headers.get("content-type")} status=${status || "(none)"} keys=${
      payload ? Object.keys(payload).join(",") : "(unparsed)"
    } body=${raw.slice(0, 400)}`
  );

  const terminal = (s: string) => ({
    done: s === "completed" || s === "succeeded" || s === "success",
    bad: s === "failed" || s === "error",
  });

  let { done: succeeded, bad: failed } = terminal(status);
  let outputUrl: string | undefined =
    typeof payload?.outputs?.[0] === "string" ? payload.outputs[0] : undefined;

  // Muapi is the authority on what happened, not the shape of its callback.
  // Asking it directly also covers a callback that arrives before the job has
  // actually finished, which would otherwise be discarded as a progress ping
  // and never followed up.
  if (!succeeded && !failed) {
    const requestId = await getJobRequestId(jobId);
    const key = process.env.MUAPI_KEY;
    if (requestId && key) {
      try {
        const result = await muapiPoll(requestId, key);
        const real = String(result.status || "").toLowerCase();
        ({ done: succeeded, bad: failed } = terminal(real));
        outputUrl = muapiOutputUrl(result) || outputUrl;
        console.log(`[muapi-webhook] job=${jobId} polled provider -> ${real || "(none)"}`);
      } catch (err: any) {
        console.error(`[muapi-webhook] job=${jobId} poll failed: ${err?.message}`);
      }
    }
  }

  if (!succeeded && !failed) {
    // Still genuinely unfinished. A non-2xx makes Muapi retry with backoff,
    // which is the only second chance available on a callback-only flow.
    return new Response(JSON.stringify({ ok: false, note: "not finished yet" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
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

  // Keep the result. The browser normally writes the Library entry when its
  // polling sees the job finish; a user who closed the app never gets there,
  // and the generation was already charged against their monthly allowance.
  if (succeeded && claimed.userId) {
    const url = outputUrl ? toDownloadUrl(outputUrl) : undefined;
    if (url) {
      await saveToLibrary({
        userId: claimed.userId,
        kind: claimed.kind,
        prompt: claimed.prompt,
        url,
      });
    }
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
  // the row is already resolved, so a retry would change nothing. It is worth
  // logging, though -- a silent failure here is invisible to everyone.
  if (!result.ok) {
    console.error(`[muapi-webhook] push failed for ${claimed.kind} job ${jobId}: ${result.error}`);
  }
  return ok(result.ok ? "notified" : `push failed: ${result.error}`);
}
