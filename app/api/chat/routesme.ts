// Isolated handler for the "Yoojel X (Beta)" model, which routes through
// the third-party OpenAI-compatible gateway at routesme.online instead of
// Anthropic. Kept separate from the main Claude path on purpose — no web
// search, no vision, and a failure here should never affect Claude models.

import type { ChatRequest } from "@/lib/types";
import { GENERIC_CHAT_ERROR } from "@/lib/errors";

const BASE_URL = "https://routesme.online/v1";

export async function streamRoutesme(
  model: string,
  body: ChatRequest,
  systemPrompt: string
): Promise<Response> {
  const apiKey = process.env.ROUTESME_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "ROUTESME_API_KEY is not set on the server." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...(body.messages || []).map((m) => ({
      role: m.role,
      content:
        m.attachments && m.attachments.length > 0
          ? `${m.content}\n\n[${m.attachments.length} image attachment(s) omitted — not supported by this model]`
          : m.content,
    })),
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        const upstream = await fetch(`${BASE_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ model, messages, stream: true }),
        });

        if (!upstream.ok || !upstream.body) {
          const errText = await upstream.text().catch(() => "");
          console.error("routesme error:", upstream.status, errText.slice(0, 200));
          send({ type: "error", error: GENERIC_CHAT_ERROR });
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });

          const lines = buf.split("\n");
          buf = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) send({ type: "text", text: delta });
            } catch {
              // ignore malformed SSE chunk
            }
          }
        }

        send({ type: "done" });
      } catch (err: any) {
        console.error("routesme stream error:", err?.message || err);
        send({ type: "error", error: GENERIC_CHAT_ERROR });
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
