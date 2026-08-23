import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";

// Yoojel Coder: single-turn code generation via DeepSeek's real hosted API
// (deepseek-harness itself -- the repo this was requested against -- is a
// local-only CLI/web-UI tool with no HTTP API, so it can't be integrated
// into this app; this calls DeepSeek's actual model API instead, which is
// OpenAI-compatible).

export const runtime = "nodejs";
export const maxDuration = 60;

const DEEPSEEK_MODEL = "deepseek-v4-pro";
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

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const key = process.env.DEEPSEEK_API_KEY;
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
    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        stream: false,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return jsonError(data?.error?.message || "Yoojel Coder request failed.", 502);
    }
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw || typeof raw !== "string") {
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
