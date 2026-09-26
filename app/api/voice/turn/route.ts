import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { checkAndIncrementUsage, VOICE_MONTHLY_LIMIT } from "@/lib/generationUsage";
import { signVoiceTicket } from "@/lib/voiceTicket";

// Opens one voice-mode turn: checks the plan, spends exactly one voice
// generation for the whole reply, and returns a short-lived ticket that
// /api/voice/omnivoice verifies locally. See lib/voiceTicket.ts for why the
// gate lives here instead of on every sentence.

export const runtime = "nodejs";
export const maxDuration = 20;

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
        `You've reached this month's limit of ${VOICE_MONTHLY_LIMIT} voice replies. It resets at the start of next month.`,
        429
      );
    }
  }

  const ticket = signVoiceTicket({ userId: auth.userId, isAdmin: auth.isAdmin });
  if (!ticket) {
    return jsonError("Voice mode isn't configured yet — contact support.", 500);
  }

  return new Response(JSON.stringify({ ticket }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
