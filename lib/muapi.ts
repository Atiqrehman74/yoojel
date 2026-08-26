// Thin server-side client for Muapi.ai's generation gateway
// (https://muapi.ai) — a single API key fronting 400+ image/video models.
// Pattern (submit a job, poll for its result) matches Muapi's own API:
// POST /api/v1/{endpoint} -> { request_id }, then
// GET  /api/v1/predictions/{request_id}/result -> { status, ... }

const MUAPI_BASE = "https://api.muapi.ai/api/v1";

export type MuapiSubmitResult = {
  request_id?: string;
  id?: string;
  [key: string]: unknown;
};

export type MuapiPollResult = {
  status?: string;
  error?: string;
  outputs?: string[];
  url?: string;
  output?: { url?: string };
};

export async function muapiSubmit(
  endpoint: string,
  payload: Record<string, unknown>,
  key: string
): Promise<MuapiSubmitResult> {
  const res = await fetch(`${MUAPI_BASE}/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Muapi request failed (${res.status})`);
  }
  return data;
}

export async function muapiPoll(requestId: string, key: string): Promise<MuapiPollResult> {
  const res = await fetch(`${MUAPI_BASE}/predictions/${requestId}/result`, {
    headers: { "x-api-key": key },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // A failed generation job is itself reported with a non-2xx HTTP status,
    // with the real status/error nested under `detail` -- unwrap it so
    // callers see a normal { status: "failed", error } result instead of a
    // generic "Muapi poll failed (400)" that hides the actual reason.
    if (data?.detail?.status) {
      return data.detail;
    }
    throw new Error(data?.error || `Muapi poll failed (${res.status})`);
  }
  return data;
}

export function muapiOutputUrl(result: MuapiPollResult): string | undefined {
  return result.outputs?.[0] || result.url || result.output?.url;
}

// Uploads a file to Muapi's hosting (POST /api/v1/upload_file, multipart
// field name "file") and returns the hosted URL -- needed for models like
// openai-whisper that take an audio_url rather than accepting raw bytes.
export async function muapiUploadFile(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  key: string
): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([Uint8Array.from(buffer)], { type: mimeType }), filename);
  const res = await fetch(`${MUAPI_BASE}/upload_file`, {
    method: "POST",
    headers: { "x-api-key": key },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.detail || data?.error || `Muapi upload failed (${res.status})`);
  }
  const url = data.url || data.file_url || data.data?.url;
  if (!url) {
    throw new Error("Muapi upload succeeded but returned no URL");
  }
  return url;
}
