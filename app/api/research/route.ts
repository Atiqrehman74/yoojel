import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { currentDateLine } from "@/lib/currentDate";

// ============================================================
//  DEEP RESEARCH  (Apps -> Deep Research)
// ------------------------------------------------------------
//  A lightweight stand-in for a full agent-harness "deep research"
//  tool (the kind bytedance/deer-flow provides) built entirely on
//  Claude's existing server-side web_search tool — no separate
//  backend, no sandboxes, no command execution. Claude runs several
//  searches within one turn and writes a cited report.
// ============================================================

export const runtime = "nodejs";
export const maxDuration = 120;

const DEPTH_CONFIG = {
  quick:    { model: "claude-sonnet-4-6", maxUses: 4,  maxTokens: 2048 },
  standard: { model: "claude-sonnet-4-6", maxUses: 8,  maxTokens: 4096 },
  deep:     { model: "claude-opus-4-7",   maxUses: 14, maxTokens: 8192 },
} as const;

type Depth = keyof typeof DEPTH_CONFIG;

const MAX_ATTACHMENT_TEXT_LENGTH = 20000;
const MAX_ATTACHMENT_BASE64_LENGTH = 14 * 1024 * 1024; // ~10MB raw

function buildSystemPrompt(): string {
  return `You are Yoojel's Deep Research assistant. Given a topic or
question, research it thoroughly using web search across multiple queries and
angles before answering. Then write a well-structured report in Markdown:

- Start with a one-paragraph executive summary.
- Use ## section headers to break the topic into themes.
- Cite claims inline like [1], [2] tied to the sources you found.
- End with a "## Open questions" section noting anything unresolved or contested.

Be thorough, accurate, and neutral. If sources disagree, say so explicitly.

${currentDateLine()} Use this to correctly interpret "latest," "this year,"
"recent," and other time-relative language in the topic — never rely on your
training data for the current date.`;
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: {
    topic?: string;
    depth?: string;
    attachment?: { mediaType?: string; base64?: string; text?: string; name?: string };
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const topic = (body.topic || "").trim();
  if (!topic) {
    return new Response(JSON.stringify({ error: "Missing topic." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const depth: Depth = body.depth === "quick" || body.depth === "deep" ? body.depth : "standard";
  const { model, maxUses, maxTokens } = DEPTH_CONFIG[depth];

  const attachment = body.attachment;
  if (attachment?.text && attachment.text.length > MAX_ATTACHMENT_TEXT_LENGTH) {
    return new Response(
      JSON.stringify({ error: `Attached file is too long (max ${MAX_ATTACHMENT_TEXT_LENGTH} characters).` }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
  if (attachment?.base64 && attachment.base64.length > MAX_ATTACHMENT_BASE64_LENGTH) {
    return new Response(JSON.stringify({ error: "Attached image is too large (max 10MB)." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (attachment?.base64 && attachment.mediaType?.startsWith("image/")) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: attachment.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: attachment.base64,
      },
    });
    userContent.push({ type: "text", text: `Research topic: ${topic}` });
  } else if (attachment?.text) {
    userContent.push({
      type: "text",
      text: `Attached file \`${attachment.name || "reference"}\`:\n\`\`\`\n${attachment.text}\n\`\`\`\n\nResearch topic: ${topic}`,
    });
  } else {
    userContent.push({ type: "text", text: `Research topic: ${topic}` });
  }

  const anthropic = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const claudeStream = anthropic.messages.stream({
          model,
          max_tokens: maxTokens,
          system: buildSystemPrompt(),
          messages: [{ role: "user", content: userContent }],
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxUses } as any],
        });

        claudeStream.on("text", (delta) => {
          send({ type: "text", text: delta });
        });

        const finalMsg = await claudeStream.finalMessage();

        const sources: { title: string; url: string }[] = [];
        for (const block of finalMsg.content) {
          const b = block as any;
          if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
            for (const r of b.content) {
              if (r?.url) sources.push({ title: r.title || r.url, url: r.url });
            }
          }
        }
        if (sources.length > 0) {
          const seen = new Set<string>();
          const unique = sources.filter((s) => (seen.has(s.url) ? false : (seen.add(s.url), true)));
          send({ type: "sources", sources: unique });
        }

        send({ type: "done" });
      } catch (err: any) {
        send({ type: "error", error: err?.message || "Research failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
