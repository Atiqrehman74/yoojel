import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit, muapiOutputUrl, muapiUploadFile } from "@/lib/muapi";
import { checkAndIncrementUsage, IMAGE_MONTHLY_LIMIT } from "@/lib/generationUsage";

// Image generation via Muapi.ai's "Nano Banana" (Google) model. Split into
// submit/result (like video) instead of polling inline: real-world latency
// observed here was ~90-110s, well past what a serverless function should
// hold a connection open for, so the client polls /api/image/result itself.
//
// When the client attaches a reference image, this switches to the
// "nano-banana-edit" endpoint (takes images_list, an array of URLs) instead
// of plain text-to-image "nano-banana" -- the attached file is uploaded to
// Muapi's file host first since the model needs a URL, not raw bytes.

export const runtime = "nodejs";
export const maxDuration = 30;

const TEXT_TO_IMAGE_ENDPOINT = "nano-banana";
const IMAGE_EDIT_ENDPOINT = "nano-banana-edit";
const ASPECT_RATIOS = new Set(["1:1", "9:16", "16:9"]);
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
    const usage = await checkAndIncrementUsage(auth.userId, "image", IMAGE_MONTHLY_LIMIT);
    if (!usage.ok) {
      return jsonError(
        `You've reached this month's limit of ${IMAGE_MONTHLY_LIMIT} images. It resets at the start of next month.`,
        429
      );
    }
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Image generation isn't configured yet — contact support.", 500);
  }

  const formData = await req.formData().catch(() => null);
  const prompt = formData?.get("prompt");
  const aspectRatioRaw = formData?.get("aspect_ratio");
  const image = formData?.get("image");

  if (!prompt || typeof prompt !== "string") {
    return jsonError("Missing prompt.", 400);
  }
  const ratio = ASPECT_RATIOS.has(aspectRatioRaw as string) ? (aspectRatioRaw as string) : "1:1";

  if (image instanceof Blob && image.size > MAX_IMAGE_BYTES) {
    return jsonError("Attached image is too large (max 10MB).", 400);
  }

  try {
    let endpoint = TEXT_TO_IMAGE_ENDPOINT;
    let payload: Record<string, unknown> = { prompt, aspect_ratio: ratio };

    if (image instanceof Blob && image.size > 0) {
      const buffer = Buffer.from(await image.arrayBuffer());
      const filename = image instanceof File ? image.name : "reference.png";
      const imageUrl = await muapiUploadFile(buffer, filename, image.type || "image/png", key);
      endpoint = IMAGE_EDIT_ENDPOINT;
      payload = { prompt, images_list: [imageUrl], aspect_ratio: ratio };
    }

    const submitted = await muapiSubmit(endpoint, payload, key);
    const requestId = submitted.request_id || submitted.id;

    // Some models can respond synchronously with no request_id.
    if (!requestId) {
      const url = muapiOutputUrl(submitted as any);
      return new Response(JSON.stringify({ done: true, url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ requestId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Image generation failed to start.", 500);
  }
}
