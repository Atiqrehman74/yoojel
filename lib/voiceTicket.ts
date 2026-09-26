import { createHmac, timingSafeEqual } from "crypto";

// Voice mode synthesizes a reply sentence by sentence, so /api/voice/omnivoice
// is hit several times for what the user experiences as one answer. Running
// the full Supabase gate (getUser + profiles lookup + usage RPC) on every one
// of those calls put three network round trips in front of each sentence and,
// worse, spent a monthly voice generation per *sentence* rather than per reply
// -- at VOICE_MONTHLY_LIMIT = 15 that capped a Pro user at roughly three
// spoken answers a month.
//
// A turn ticket moves that gate to once per reply: /api/voice/turn does the
// auth and usage accounting and hands back a short-lived HMAC ticket, which
// the synthesis route verifies locally with no network calls at all. Signed
// with the service role key, which never leaves the server, so a ticket can't
// be forged by a client.

const TICKET_TTL_MS = 10 * 60 * 1000;

export type VoiceTicketClaims = { userId: string; isAdmin: boolean };

function signingKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export function signVoiceTicket(claims: VoiceTicketClaims): string | null {
  const key = signingKey();
  if (!key) return null;
  const payload = Buffer.from(
    JSON.stringify({ u: claims.userId, a: claims.isAdmin, e: Date.now() + TICKET_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload, key)}`;
}

export function verifyVoiceTicket(ticket: string | null | undefined): VoiceTicketClaims | null {
  const key = signingKey();
  if (!key || !ticket) return null;

  const dot = ticket.indexOf(".");
  if (dot <= 0) return null;
  const payload = ticket.slice(0, dot);
  const provided = Buffer.from(ticket.slice(dot + 1));
  const expected = Buffer.from(sign(payload, key));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof data?.e !== "number" || Date.now() > data.e) return null;
    if (typeof data?.u !== "string" || !data.u) return null;
    return { userId: data.u, isAdmin: !!data.a };
  } catch {
    return null;
  }
}
