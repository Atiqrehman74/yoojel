import { NextRequest } from "next/server";

// ============================================================
//  IMAGE GENERATION  (OPTIONAL)
// ------------------------------------------------------------
//  IMPORTANT: The Claude API does NOT generate images. To make
//  the "Create an image" button work, plug in ANY image provider
//  here and set IMAGE_API_KEY in your environment.
//
//  The example below calls OpenAI's image endpoint. Swap it for
//  Stability AI, Replicate, Fal, Together, etc. — just return a
//  JSON object shaped like:  { "url": "https://..." }  OR
//  { "b64": "<base64 png>" }.
// ============================================================

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const key = process.env.IMAGE_API_KEY;

  if (!key) {
    return new Response(
      JSON.stringify({
        error:
          "Image generation is not configured. Add IMAGE_API_KEY in your environment to enable it. (Claude itself cannot create images.)",
      }),
      { status: 501, headers: { "Content-Type": "application/json" } }
    );
  }

  const { prompt } = await req.json();
  if (!prompt) {
    return new Response(JSON.stringify({ error: "Missing prompt." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // ---- EXAMPLE: OpenAI image API. Replace with your provider. ----
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Image API error." }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const item = data?.data?.[0] || {};
    return new Response(
      JSON.stringify({ url: item.url, b64: item.b64_json }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Image generation failed." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
