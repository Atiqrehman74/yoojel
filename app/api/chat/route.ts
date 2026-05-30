import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { DEFAULT_MODEL, isValidModel } from "@/lib/models";
import type { ChatRequest } from "@/lib/types";

// Run on the Edge-friendly Node runtime; streaming works on Vercel.
export const runtime = "nodejs";
export const maxDuration = 60; // seconds (Vercel function timeout)

const SYSTEM_PROMPT = `You are Yoojel, a helpful, friendly AI assistant for yoojel.com.
You can write and edit text, answer questions, analyze images the user uploads,
explain concepts, write and debug code, and—when web search is enabled—look up
current information from the internet and cite your sources.
Be clear, accurate, and concise. Use Markdown for formatting and fenced code
blocks (with a language tag) for code. If you are unsure, say so.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ANTHROPIC_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model = isValidModel(body.model) ? body.model : DEFAULT_MODEL;
  const useWebSearch = Boolean(body.webSearch);

  // Build Anthropic-format messages (supports text + images).
  const messages: Anthropic.MessageParam[] = (body.messages || []).map((m) => {
    if (m.role === "user" && m.attachments && m.attachments.length > 0) {
      const blocks: Anthropic.ContentBlockParam[] = m.attachments.map((a) => ({
        type: "image",
        source: {
          type: "base64",
          media_type: a.mediaType as
            | "image/jpeg"
            | "image/png"
            | "image/gif"
            | "image/webp",
          data: a.base64,
        },
      }));
      if (m.content) blocks.push({ type: "text", text: m.content });
      return { role: "user", content: blocks };
    }
    return { role: m.role, content: m.content };
  });

  // Optional server-side web search tool (Claude runs it for you).
  // Cast to any: this is a server-managed tool and has no input_schema.
  const tools = useWebSearch
    ? ([{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] as any)
    : undefined;

  const anthropic = new Anthropic({ apiKey });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const claudeStream = anthropic.messages.stream({
          model,
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
          ...(tools ? { tools } : {}),
        });

        const sources: { title: string; url: string }[] = [];

        claudeStream.on("text", (delta) => {
          send({ type: "text", text: delta });
        });

        // Capture web-search citations as they arrive.
        claudeStream.on("contentBlock", (block: any) => {
          if (block?.type === "web_search_tool_result" && Array.isArray(block.content)) {
            for (const r of block.content) {
              if (r?.url) {
                sources.push({ title: r.title || r.url, url: r.url });
              }
            }
          }
        });

        await claudeStream.finalMessage();

        if (sources.length > 0) {
          // de-duplicate by url
          const seen = new Set<string>();
          const unique = sources.filter((s) =>
            seen.has(s.url) ? false : (seen.add(s.url), true)
          );
          send({ type: "sources", sources: unique });
        }

        send({ type: "done" });
      } catch (err: any) {
        send({
          type: "error",
          error: err?.message || "Something went wrong talking to Claude.",
        });
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
