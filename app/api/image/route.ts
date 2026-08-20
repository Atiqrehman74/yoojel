import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit, muapiPoll, muapiOutputUrl } from "@/lib/muapi";

// Image generation via Muapi.ai's "Nano Banana" (Google) model — simple
// prompt + aspect_ratio schema, fast enough to submit-and-poll within one
// request (unlike video, which needs the client-driven flow in /api/video).

export const runtime = "nodejs";
export const maxDuration = 60;

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
      return new Response(JSON.stringify({ url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    for (let attempt = 0; attempt < 25; attempt++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await muapiPoll(requestId, key);
      const status = result.status?.toLowerCase();
      if (status === "completed" || status === "succeeded" || status === "success") {
        return new Response(JSON.stringify({ url: muapiOutputUrl(result) }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (status === "failed" || status === "error") {
        return jsonError(result.error || "Image generation failed.", 502);
      }
    }
    return jsonError("Image generation timed out.", 504);
  } catch (err: any) {
    return jsonError(err?.message || "Image generation failed.", 500);
  }
}
