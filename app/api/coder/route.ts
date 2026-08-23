import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";

// Yoojel Coder: single-turn code generation via api.b.ai (OpenAI-compatible
// gateway), model deepseek-v4-flash -- free on this gateway, unlike
// gpt-5.2 which needed a deposit. Originally pointed at DeepSeek's own
// API, then swapped to api.b.ai on request -- both deepseek-harness and
// OmniRoute (the two repos suggested as "the real backend") turned out to
// be local-only tools with no hosted API, so a real hosted gateway is
// used instead.

export const runtime = "nodejs";
export const maxDuration = 60;

const BAI_MODEL = "deepseek-v4-flash";
const MAX_PROMPT_LENGTH = 4000;

const SYSTEM_PROMPT = `You are Yoojel Coder, a code generation assistant. Given a request, write
complete, working code -- no placeholders, no "// TODO: implement this",
no truncation. Prefer a single file unless the request genuinely needs
more than one.

Respond using EXACTLY this format for every file, with no other text
before, between, or after the file blocks:

=== FILENAME: path/to/file.ext ===
<the complete file content, nothing else>
=== END FILE ===

Repeat the block for each additional file. Choose a real filename with
the correct extension for the language (e.g. index.html, script.js,
main.py) -- never a placeholder name.`;

type CodeFile = { filename: string; content: string };

function parseFiles(raw: string): CodeFile[] {
  const files: CodeFile[] = [];
  const re = /===\s*FILENAME:\s*(.+?)\s*===\n([\s\S]*?)\n===\s*END FILE\s*===/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    files.push({ filename: m[1].trim(), content: m[2] });
  }
  if (files.length === 0 && raw.trim()) {
    // Model ignored the format -- fall back to the raw response as one file,
    // stripping a wrapping fenced code block if present.
    const fenced = raw.match(/```[a-zA-Z0-9]*\n([\s\S]*?)```/);
    files.push({ filename: "code.txt", content: fenced ? fenced[1] : raw.trim() });
  }
  return files;
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// api.b.ai streams SSE ("data: {...}\n\n", terminated by "data: [DONE]").
// Aggregated into the full text server-side so the response contract to
// the client (a parsed {files} JSON) stays unchanged.
async function consumeStream(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const delta = parsed?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") full += delta;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
  return full;
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const key = process.env.BAI_API_KEY;
  if (!key) {
    return jsonError("Yoojel Coder isn't configured yet — contact support.", 500);
  }

  const { prompt } = await req.json().catch(() => ({}));
  if (!prompt || typeof prompt !== "string") {
    return jsonError("Missing prompt.", 400);
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(`Prompt is too long (max ${MAX_PROMPT_LENGTH} characters).`, 400);
  }

  try {
    const res = await fetch("https://api.b.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: BAI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return jsonError(errBody?.error?.message || `Yoojel Coder request failed (${res.status}).`, 502);
    }

    const raw = await consumeStream(res);
    if (!raw.trim()) {
      return jsonError("No code returned.", 502);
    }
    const files = parseFiles(raw);
    return new Response(JSON.stringify({ files }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Yoojel Coder request failed.", 500);
  }
}
