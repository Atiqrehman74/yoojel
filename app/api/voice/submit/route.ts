import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireProUser } from "@/lib/requireProUser";
import { muapiSubmit } from "@/lib/muapi";
import { checkAndIncrementUsage, VOICE_MONTHLY_LIMIT } from "@/lib/generationUsage";

// Text-to-speech via Muapi.ai's Minimax Speech 2.6 HD model. Same
// submit/result split as video: TTS on a long passage can take a while,
// longer than a serverless function should hold a connection open for.

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL_ENDPOINT = "minimax-speech-2.6-hd";

// A curated subset of the model's ~150+ voice_id options -- clear, distinct
// English voices rather than dumping the entire (mostly non-English) catalog
// on users. Keep in sync with VOICES in app/apps/voice-studio/page.tsx.
const VOICE_IDS = new Set([
  "Friendly_Person",
  "Wise_Woman",
  "Deep_Voice_Man",
  "Calm_Woman",
  "English_expressive_narrator",
  "English_radiant_girl",
  "English_Trustworth_Man",
  "English_Upbeat_Woman",
  "English_Gentle-voiced_man",
  "English_Graceful_Lady",
  "English_ManWithDeepVoice",
  "English_CaptivatingStoryteller",
  "English_Comedian",
  "English_Aussie_Bloke",
]);

const MAX_PROMPT_LENGTH = 2000;

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
    const usage = await checkAndIncrementUsage(auth.userId, "voice", VOICE_MONTHLY_LIMIT);
    if (!usage.ok) {
      return jsonError(
        `You've reached this month's limit of ${VOICE_MONTHLY_LIMIT} voice generations. It resets at the start of next month.`,
        429
      );
    }
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Voice generation isn't configured yet — contact support.", 500);
  }

  const { prompt, voice_id } = await req.json();
  if (!prompt || typeof prompt !== "string") {
    return jsonError("Missing text.", 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(`Text is too long (max ${MAX_PROMPT_LENGTH} characters).`, 400);
  }

  let resolvedVoiceId = "Friendly_Person";
  if (VOICE_IDS.has(voice_id)) {
    resolvedVoiceId = voice_id;
  } else if (typeof voice_id === "string" && voice_id.startsWith("yj")) {
    // A cloned voice -- verify the caller actually owns it before letting
    // them speak with it (cloned voice_ids aren't guessable, but ownership
    // is still checked explicitly rather than trusted from the client).
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });
    const { data } = await admin
      .from("cloned_voices")
      .select("voice_id")
      .eq("voice_id", voice_id)
      .eq("user_id", auth.userId)
      .maybeSingle();
    if (data) resolvedVoiceId = voice_id;
  }

  const payload = {
    prompt,
    voice_id: resolvedVoiceId,
  };

  try {
    const submitted = await muapiSubmit(MODEL_ENDPOINT, payload, key);
    const requestId = submitted.request_id || submitted.id;
    if (!requestId) {
      return jsonError("Voice provider returned no request id.", 502);
    }
    return new Response(JSON.stringify({ requestId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Voice generation failed to start.", 500);
  }
}
