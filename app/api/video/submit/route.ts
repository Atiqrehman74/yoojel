import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit } from "@/lib/muapi";

// Video generation via Muapi.ai's Wan 2.1 (Alibaba) text-to-video model.
// Unlike image generation, this can take minutes -- longer than a serverless
// function should hold a connection open -- so this route only submits the
// job and returns a request_id; the client polls /api/video/result.

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_ENDPOINT = "wan2.1-text-to-video";
const ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const DURATIONS = new Set([5, 10]);
const RESOLUTIONS = new Set(["480p", "720p"]);

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Video generation isn't configured yet — contact support.", 500);
  }

  const { prompt, aspect_ratio, duration, resolution } = await req.json();
  if (!prompt) {
    return jsonError("Missing prompt.", 400);
  }

  const payload = {
    prompt,
    aspect_ratio: ASPECT_RATIOS.has(aspect_ratio) ? aspect_ratio : "16:9",
    duration: DURATIONS.has(duration) ? duration : 5,
    resolution: RESOLUTIONS.has(resolution) ? resolution : "480p",
    quality: "medium",
  };

  try {
    const submitted = await muapiSubmit(MODEL_ENDPOINT, payload, key);
    const requestId = submitted.request_id || submitted.id;
    if (!requestId) {
      return jsonError("Video provider returned no request id.", 502);
    }
    return new Response(JSON.stringify({ requestId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Video generation failed to start.", 500);
  }
}
