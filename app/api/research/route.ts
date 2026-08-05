import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

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

const SYSTEM_PROMPT = `You are Yoojel's Deep Research assistant. Given a topic or
question, research it thoroughly using web search across multiple queries and
angles before answering. Then write a well-structured report in Markdown:

- Start with a one-paragraph executive summary.
- Use ## section headers to break the topic into themes.
- Cite claims inline like [1], [2] tied to the sources you found.
- End with a "## Open questions" section noting anything unresolved or contested.

Be thorough, accurate, and neutral. If sources disagree, say so explicitly.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: { topic?: string; depth?: string };
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
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Research topic: ${topic}` }],
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
