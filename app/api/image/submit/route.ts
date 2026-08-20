import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit, muapiOutputUrl } from "@/lib/muapi";

// Image generation via Muapi.ai's "Nano Banana" (Google) model. Split into
// submit/result (like video) instead of polling inline: real-world latency
// observed here was ~90-110s, well past what a serverless function should
// hold a connection open for, so the client polls /api/image/result itself.

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_ENDPOINT = "nano-banana";
const ASPECT_RATIOS = new Set(["1:1", "9:16", "16:9"]);

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
    return jsonError("Image generation isn't configured yet — contact support.", 500);
  }

  const { prompt, aspect_ratio } = await req.json();
  if (!prompt) {
    return jsonError("Missing prompt.", 400);
  }
  const ratio = ASPECT_RATIOS.has(aspect_ratio) ? aspect_ratio : "1:1";

  try {
    const submitted = await muapiSubmit(MODEL_ENDPOINT, { prompt, aspect_ratio: ratio }, key);
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
