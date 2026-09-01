import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { checkAndIncrementUsage, VOICE_MONTHLY_LIMIT } from "@/lib/generationUsage";

// Text-to-speech for voice mode via a self-hosted OmniVoice model on Modal
// (see /omnivoice-server). Unlike /api/voice/submit (Muapi, used by Voice
// Studio), this is a single synchronous call -- OmniVoice's RTF (~0.025,
// 40x real-time) makes a warm-container round trip fast enough to not need
// a submit/poll split. Response body is the raw WAV audio, not JSON.

export const runtime = "nodejs";
export const maxDuration = 60; // covers a cold Modal container (~15-30s) + inference

const MAX_TEXT_LENGTH = 2000;

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

  const endpoint = process.env.OMNIVOICE_ENDPOINT_URL;
  const secret = process.env.OMNIVOICE_API_SECRET;
  if (!endpoint || !secret) {
    return jsonError("Voice generation isn't configured yet — contact support.", 500);
  }

  const { text } = await req.json();
  if (!text || typeof text !== "string") {
    return jsonError("Missing text.", 400);
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(`Text is too long (max ${MAX_TEXT_LENGTH} characters).`, 400);
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return jsonError(detail || `Voice generation failed (${res.status}).`, 502);
    }

    const audio = await res.arrayBuffer();
    return new Response(audio, {
      status: 200,
      headers: { "Content-Type": "audio/wav" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Voice generation failed.", 500);
  }
}
