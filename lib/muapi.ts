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
    throw new Error(data?.error || `Muapi poll failed (${res.status})`);
  }
  return data;
}

export function muapiOutputUrl(result: MuapiPollResult): string | undefined {
  return result.outputs?.[0] || result.url || result.output?.url;
}
