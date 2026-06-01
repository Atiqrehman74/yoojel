"use client";

import { useEffect, useRef } from "react";
import Markdown from "./Markdown";
import { ExternalLink } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
}

export default function MessageList({ messages, streaming }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 pt-4 md:px-4 md:pb-6 md:pt-6">
      {messages.map((m, idx) => {
        const isUser = m.role === "user";
        const isLast = idx === messages.length - 1;
        const showCursor = streaming && isLast && m.role === "assistant";

        return (
          <div key={m.id} className={`mb-4 flex md:mb-6 ${isUser ? "justify-end" : "justify-start"}`}>
            {isUser ? (
              <div className="max-w-[85%] md:max-w-[80%]">
                {m.attachments && m.attachments.length > 0 && (
                  <div className="mb-2 flex flex-wrap justify-end gap-2">
                    {m.attachments.map((a, i) => (
                      <img
                        key={i}
                        src={a.dataUrl}
                        alt="attachment"
                        className="max-h-48 rounded-xl object-cover md:max-h-60"
                      />
                    ))}
                  </div>
                )}
                {m.content && (
                  <div className="whitespace-pre-wrap rounded-3xl bg-bubble px-4 py-2.5 text-[15px] text-gray-100 md:px-5">
                    {m.content}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full gap-3 md:gap-4">
                <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#1a1a1a] md:h-8 md:w-8">
                  <img src="/yoojel-insignia.png" alt="Yoojel" className="h-6 w-6 object-contain md:h-7 md:w-7" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  {m.content ? (
                    <div className={showCursor ? "cursor-blink-wrap" : ""}>
                      <Markdown content={m.content} />
                      {showCursor && <span className="cursor-blink" />}
                    </div>
                  ) : showCursor ? (
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="typing-dot" style={{ animationDelay: "0s" }} />
                      <span className="typing-dot" style={{ animationDelay: "0.2s" }} />
                      <span className="typing-dot" style={{ animationDelay: "0.4s" }} />
                    </div>
                  ) : null}

                  {/* web sources */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="mb-2 text-xs font-medium text-gray-400">Sources</p>
                      <div className="flex flex-col gap-1.5">
                        {m.sources.map((s, i) => (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-400"
                          >
                            <ExternalLink size={12} className="flex-shrink-0" />
                            <span className="truncate">{s.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
