import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit, muapiUploadFile } from "@/lib/muapi";
import { checkAndIncrementUsage, VIDEO_MONTHLY_LIMIT } from "@/lib/generationUsage";

// Video generation via Muapi.ai's Wan 2.1 (Alibaba) models. Unlike image
// generation, this can take minutes -- longer than a serverless function
// should hold a connection open -- so this route only submits the job and
// returns a request_id; the client polls /api/video/result.
//
// duration is capped at 10s by DURATIONS below -- there is no path to
// request anything longer.
//
// When the client attaches a reference image, this switches to
// "wan2.1-image-to-video" (takes a single image_url) instead of
// "wan2.1-text-to-video".

export const runtime = "nodejs";
export const maxDuration = 30;

const TEXT_TO_VIDEO_ENDPOINT = "wan2.1-text-to-video";
const IMAGE_TO_VIDEO_ENDPOINT = "wan2.1-image-to-video";
const ASPECT_RATIOS = new Set(["16:9", "9:16"]);
const DURATIONS = new Set([5, 10]);
const RESOLUTIONS = new Set(["480p", "720p"]);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

  if (!auth.isAdmin) {
    const usage = await checkAndIncrementUsage(auth.userId, "video", VIDEO_MONTHLY_LIMIT);
    if (!usage.ok) {
      return jsonError(
        `You've reached this month's limit of ${VIDEO_MONTHLY_LIMIT} videos. It resets at the start of next month.`,
        429
      );
    }
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Video generation isn't configured yet — contact support.", 500);
  }

  const formData = await req.formData().catch(() => null);
  const prompt = formData?.get("prompt");
  const aspectRatioRaw = formData?.get("aspect_ratio");
  const durationRaw = Number(formData?.get("duration"));
  const resolutionRaw = formData?.get("resolution");
  const image = formData?.get("image");

  if (!prompt || typeof prompt !== "string") {
    return jsonError("Missing prompt.", 400);
  }

  if (image instanceof Blob && image.size > MAX_IMAGE_BYTES) {
    return jsonError("Attached image is too large (max 10MB).", 400);
  }

  const payload: Record<string, unknown> = {
    prompt,
    aspect_ratio: ASPECT_RATIOS.has(aspectRatioRaw as string) ? aspectRatioRaw : "16:9",
    duration: DURATIONS.has(durationRaw) ? durationRaw : 5,
    resolution: RESOLUTIONS.has(resolutionRaw as string) ? resolutionRaw : "480p",
    quality: "medium",
  };

  try {
    let endpoint = TEXT_TO_VIDEO_ENDPOINT;

    if (image instanceof Blob && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = image instanceof File ? image.name : "reference.png";
      const imageUrl = await muapiUploadFile(buffer, filename, image.type || "image/png", key);
      endpoint = IMAGE_TO_VIDEO_ENDPOINT;
      payload.image_url = imageUrl;
    }

    const submitted = await muapiSubmit(endpoint, payload, key);
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
