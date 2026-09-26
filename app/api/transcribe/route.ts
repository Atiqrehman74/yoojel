import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiUploadFile, muapiSubmit, muapiPoll } from "@/lib/muapi";

// Speech-to-text via Muapi.ai's openai-whisper model. Replaces the
// browser's SpeechRecognition for both dictation and voice mode -- see
// lib/audioRecorder.ts for why. Fast enough (~1.5-3s observed) to handle
// as one synchronous request rather than the submit/poll split used for
// slower image/video generation.

export const runtime = "nodejs";
export const maxDuration = 45;

const WHISPER_ENDPOINT = "openai-whisper";
const MAX_AUDIO_BYTES = 15 * 1024 * 1024;

// Whisper on a few seconds of speech usually finishes well inside a second,
// so the loop polls immediately and only then backs off. A fixed interval
// that slept *before* the first poll quantized every transcription to a
// multiple of that interval no matter how fast the job really was, which is
// dead time on the critical path of every voice-mode turn.
const POLL_MIN_MS = 150;
const POLL_MAX_MS = 1200;
const POLL_GROWTH = 1.5;
const POLL_DEADLINE_MS = 35_000;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extForMimeType(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Speech-to-text isn't configured yet — contact support.", 500);
  }

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("audio");
  if (!file || !(file instanceof Blob)) {
    return jsonError("Missing audio.", 400);
  }
  if (file.size === 0) {
    return jsonError("No audio recorded.", 400);
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return jsonError("Recording is too long.", 400);
  }
  const language = formData?.get("language");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "audio/webm";
    const audioUrl = await muapiUploadFile(buffer, `recording.${extForMimeType(mimeType)}`, mimeType, key);

    const submitted = await muapiSubmit(
      WHISPER_ENDPOINT,
      { audio_url: audioUrl, ...(typeof language === "string" && language ? { language } : {}) },
      key
    );
    const requestId = submitted.request_id || submitted.id;
    if (!requestId) {
      return jsonError("Transcription provider returned no request id.", 502);
    }

    const deadline = Date.now() + POLL_DEADLINE_MS;
    let delay = 0;
    while (Date.now() < deadline) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      delay = delay ? Math.min(Math.round(delay * POLL_GROWTH), POLL_MAX_MS) : POLL_MIN_MS;

      const result = await muapiPoll(requestId, key);
      const status = result.status?.toLowerCase();
      if (status === "completed" || status === "succeeded" || status === "success") {
        const raw = result.outputs?.[0];
        let text = "";
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            text = typeof parsed?.text === "string" ? parsed.text : raw;
          } catch {
            text = raw;
          }
        }
        return new Response(JSON.stringify({ text: text.trim() }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (status === "failed" || status === "error") {
        return jsonError(result.error || "Transcription failed.", 502);
      }
    }
    return jsonError("Transcription timed out.", 504);
  } catch (err: any) {
    return jsonError(err?.message || "Transcription failed.", 500);
  }
}
