import { NextRequest } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit, muapiUploadFile } from "@/lib/muapi";
import { VOICE_CLONE_MONTHLY_LIMIT } from "@/lib/generationUsage";

// Voice cloning via Muapi.ai's Minimax Voice Clone model: submit a reference
// audio sample + a system-generated custom_voice_id, poll (see
// app/api/voice/clone/result/route.ts) until Minimax finishes analyzing it,
// then that same voice_id is immediately reusable in normal
// minimax-speech-2.6-hd calls (app/api/voice/submit) -- verified live end to
// end before shipping, including that a too-short reference sample fails
// with a clear "voice duration too short" error rather than a silent 500.
//
// Requires explicit consent because this clones a real person's voice from
// an uploaded sample -- a meaningfully different risk from generating an
// image or video, so it isn't treated as "just another attachment."

export const runtime = "nodejs";
export const maxDuration = 30;

const CLONE_ENDPOINT = "minimax-voice-clone";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;
const MAX_NAME_LENGTH = 40;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

// Minimax requires custom_voice_id to start with a letter and contain only
// letters/numbers -- generated rather than derived from the user's free-text
// name so it's always valid and collision-safe.
function generateVoiceId(): string {
  return `yj${crypto.randomBytes(6).toString("hex")}`;
}

export async function GET(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await admin()
    .from("cloned_voices")
    .select("id, voice_id, name, preview_url, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("cloned_voices GET error:", error.message);
    return jsonError("Failed to load cloned voices.", 500);
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  if (!auth.isAdmin) {
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await admin()
      .from("cloned_voices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.userId)
      .gte("created_at", startOfMonth.toISOString());
    if (countError) {
      console.error("cloned_voices count error:", countError.message);
      return jsonError("Failed to check your voice clone usage.", 500);
    }
    if ((count ?? 0) >= VOICE_CLONE_MONTHLY_LIMIT) {
      return jsonError(
        `You've reached this month's limit of ${VOICE_CLONE_MONTHLY_LIMIT} cloned voices. It resets at the start of next month.`,
        429
      );
    }
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Voice cloning isn't configured yet — contact support.", 500);
  }

  const formData = await req.formData().catch(() => null);
  const audio = formData?.get("audio");
  const name = formData?.get("name");
  const consent = formData?.get("consent");

  if (consent !== "true") {
    return jsonError("You must confirm you have the right to use this voice.", 400);
  }
  if (!name || typeof name !== "string" || !name.trim()) {
    return jsonError("Missing a name for this voice.", 400);
  }
  if (name.length > MAX_NAME_LENGTH) {
    return jsonError(`Name is too long (max ${MAX_NAME_LENGTH} characters).`, 400);
  }
  if (!(audio instanceof Blob) || audio.size === 0) {
    return jsonError("Missing reference audio.", 400);
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError("Reference audio is too large (max 15MB).", 400);
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const filename = audio instanceof File ? audio.name : "reference.mp3";
    const audioUrl = await muapiUploadFile(buffer, filename, audio.type || "audio/mpeg", key);

    const voiceId = generateVoiceId();
    const submitted = await muapiSubmit(
      CLONE_ENDPOINT,
      {
        audio_url: audioUrl,
        custom_voice_id: voiceId,
        prompt: `Hello! This is a preview of the "${name.trim()}" voice on Yoojel.`,
        need_noise_reduction: true,
        need_volume_normalization: true,
      },
      key
    );
    const requestId = submitted.request_id || submitted.id;
    if (!requestId) {
      return jsonError("Voice cloning provider returned no request id.", 502);
    }

    return new Response(JSON.stringify({ requestId, voiceId, name: name.trim() }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Voice cloning failed to start.", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Missing id.", 400);

  const { error } = await admin().from("cloned_voices").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) {
    console.error("cloned_voices DELETE error:", error.message);
    return jsonError("Failed to delete.", 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
