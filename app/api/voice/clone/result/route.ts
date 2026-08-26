import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireProUser } from "@/lib/requireProUser";
import { muapiPoll, muapiOutputUrl } from "@/lib/muapi";

export const runtime = "nodejs";
export const maxDuration = 15;

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return Response.json({ error: "Voice cloning isn't configured yet — contact support." }, { status: 500 });
  }

  const requestId = req.nextUrl.searchParams.get("id");
  const voiceId = req.nextUrl.searchParams.get("voiceId");
  const name = req.nextUrl.searchParams.get("name");
  if (!requestId || !voiceId || !name) {
    return Response.json({ error: "Missing id/voiceId/name." }, { status: 400 });
  }

  try {
    const result = await muapiPoll(requestId, key);
    const status = result.status?.toLowerCase();

    if (status === "completed" || status === "succeeded" || status === "success") {
      const previewUrl = muapiOutputUrl(result);
      const { data, error } = await admin()
        .from("cloned_voices")
        .insert({ user_id: auth.userId, voice_id: voiceId, name, preview_url: previewUrl })
        .select("id, voice_id, name, preview_url, created_at")
        .single();
      if (error) {
        console.error("cloned_voices insert error:", error.message);
        return Response.json({ error: "Voice cloned but failed to save it — please retry." }, { status: 500 });
      }
      return Response.json({ status: "done", item: data });
    }
    if (status === "failed" || status === "error") {
      return Response.json({ status: "failed", error: result.error || "Voice cloning failed." });
    }
    return Response.json({ status: "pending" });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Poll failed." }, { status: 502 });
  }
}
