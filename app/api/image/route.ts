import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ============================================================
//  IMAGE GENERATION — OpenAI gpt-image-1, gated to Pro accounts
// ============================================================

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!supabaseUrl || !serviceKey || !token) {
    return jsonError("Sign in to use Image Studio.", 401);
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) {
    return jsonError("Sign in to use Image Studio.", 401);
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.plan !== "pro" && !profile.is_admin)) {
    return jsonError("Image generation is a Pro feature. Subscribe to Yoojel Pro to unlock it.", 403);
  }

  const key = process.env.IMAGE_API_KEY;
  if (!key) {
    return jsonError("Image generation isn't configured yet — contact support.", 500);
  }

  const { prompt, size } = await req.json();
  if (!prompt) {
    return jsonError("Missing prompt.", 400);
  }

  // gpt-image-1's supported sizes (not DALL-E 3's 1024x1792/1792x1024).
  const ALLOWED_SIZES = ["1024x1024", "1024x1536", "1536x1024"];
  const imageSize = ALLOWED_SIZES.includes(size) ? size : "1024x1024";

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: imageSize,
        n: 1,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return jsonError(data?.error?.message || "Image API error.", 502);
    }

    // gpt-image-1 only returns b64_json, never a url.
    const item = data?.data?.[0] || {};
    return new Response(JSON.stringify({ url: item.url, b64: item.b64_json }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Image generation failed.", 500);
  }
}
