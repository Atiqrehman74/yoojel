import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";

// Wakes the OmniVoice container on Modal without waiting for a reply to be
// ready to speak. Modal scales the GPU to zero after 10 minutes idle, and a
// cold start costs 15-30s -- long enough that the first sentence of a reply
// can blow past the synthesis route's own timeout and surface as "Couldn't
// speak the reply." Voice mode calls this the moment it starts listening, so
// the container boots while the user is still talking and the cold start is
// hidden behind speech, transcription, and the model's first sentence.
//
// The upstream call is awaited rather than left dangling: the serverless
// function would otherwise be free to exit and cancel it. Nothing waits on
// this route's response, so its duration costs the user nothing.

export const runtime = "nodejs";
export const maxDuration = 60;

const WARM_TEXT = "ok";

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return new Response(null, { status: 204 });
  }

  const endpoint = process.env.OMNIVOICE_ENDPOINT_URL;
  const secret = process.env.OMNIVOICE_API_SECRET;
  if (!endpoint || !secret) {
    return new Response(null, { status: 204 });
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ text: WARM_TEXT }),
    });
    // Drain the body so the connection is released rather than left half-read.
    await res.arrayBuffer().catch(() => {});
  } catch {
    // A failed warm-up is not an error worth reporting -- the real synthesis
    // call will surface anything genuinely broken.
  }

  return new Response(null, { status: 204 });
}
