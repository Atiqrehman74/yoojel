"use client";

import { useEffect, useRef } from "react";
import Markdown from "./Markdown";
import { Globe, ExternalLink } from "lucide-react";
import type { ChatMessage } from "@/lib/types";

interface Props {
  messages: ChatMessage[];
  streaming: boolean;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function getFaviconUrl(url: string): string {
  try {
    const origin = new URL(url).origin;
    return `https://www.google.com/s2/favicons?domain=${origin}&sz=32`;
  } catch {
    return "";
  }
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

                  {/* Web search sources */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-4">
                      {/* Header */}
                      <div className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <Globe size={13} />
                        <span>Sources</span>
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-gray-400">
                          {m.sources.length}
                        </span>
                      </div>

                      {/* Source cards */}
                      <div className="flex flex-col gap-2">
                        {m.sources.map((s, i) => {
                          const domain = getDomain(s.url);
                          const favicon = getFaviconUrl(s.url);
                          return (
                            <a
                              key={i}
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group flex items-start gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 transition-colors hover:border-white/15 hover:bg-white/8"
                            >
                              {/* Number */}
                              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-gray-400">
                                {i + 1}
                              </span>

                              {/* Favicon + text */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  {favicon && (
                                    <img
                                      src={favicon}
                                      alt=""
                                      className="h-3.5 w-3.5 flex-shrink-0 rounded-sm"
                                      onError={(e) => {
                                        (e.currentTarget as HTMLImageElement).style.display = "none";
                                      }}
                                    />
                                  )}
                                  <span className="text-[11px] text-gray-500 truncate">{domain}</span>
                                </div>
                                <p className="text-sm leading-snug text-gray-200 line-clamp-2 group-hover:text-white">
                                  {s.title || domain}
                                </p>
                              </div>

                              {/* Arrow */}
                              <ExternalLink
                                size={13}
                                className="mt-1 flex-shrink-0 text-gray-600 group-hover:text-gray-400"
                              />
                            </a>
                          );
                        })}
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
