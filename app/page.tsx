"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Sparkles,
  ImageIcon,
  PenLine,
  Globe,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import MessageList from "@/components/MessageList";
import Composer from "@/components/Composer";
import { MODELS, DEFAULT_MODEL } from "@/lib/models";
import type {
  Attachment,
  ChatMessage,
  Conversation,
} from "@/lib/types";

const STORAGE_KEY = "yoojel-conversations";
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [modelMenu, setModelMenu] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const active = conversations.find((c) => c.id === activeId) || null;
  const messages = active?.messages ?? [];

  // ---- load / persist ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Conversation[] = JSON.parse(raw);
        setConversations(parsed);
        if (parsed[0]) setActiveId(parsed[0].id);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {}
  }, [conversations]);

  // ---- helpers ----
  const patchActive = (fn: (c: Conversation) => Conversation) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? fn(c) : c))
    );

  const newChat = () => {
    setActiveId(null);
    setImageMode(false);
  };

  const deleteChat = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const ensureConversation = (firstUserText: string): string => {
    if (activeId && active) return activeId;
    const id = uid();
    const convo: Conversation = {
      id,
      title: firstUserText.slice(0, 40) || "New chat",
      messages: [],
      model,
      createdAt: Date.now(),
    };
    setConversations((prev) => [convo, ...prev]);
    setActiveId(id);
    return id;
  };

  // ---- image generation path ----
  const generateImage = async (prompt: string) => {
    const convoId = ensureConversation(prompt);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: prompt,
      createdAt: Date.now(),
    };
    const aiMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? { ...c, messages: [...c.messages, userMsg, aiMsg] }
          : c
      )
    );
    setStreaming(true);
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      const content = !res.ok
        ? `⚠️ ${data.error}`
        : data.url
        ? `![generated image](${data.url})`
        : data.b64
        ? `![generated image](data:image/png;base64,${data.b64})`
        : "No image returned.";
      setConversations((prev) =>
        prev.map((c) =>
          c.id === convoId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === aiMsg.id ? { ...m, content } : m
                ),
              }
            : c
        )
      );
    } finally {
      setStreaming(false);
      setImageMode(false);
    }
  };

  // ---- chat (streaming) path ----
  const sendMessage = async (text: string, attachments: Attachment[]) => {
    if (imageMode) return generateImage(text);

    const convoId = ensureConversation(text);
    const userMsg: ChatMessage = {
      id: uid(),
      role: "user",
      content: text,
      attachments: attachments.length ? attachments : undefined,
      createdAt: Date.now(),
    };
    const aiMsg: ChatMessage = {
      id: uid(),
      role: "assistant",
      content: "",
      createdAt: Date.now(),
    };

    // snapshot history for the API (before adding empty assistant msg)
    const baseConvo = conversations.find((c) => c.id === convoId);
    const history = [...(baseConvo?.messages ?? []), userMsg];

    setConversations((prev) =>
      prev.map((c) =>
        c.id === convoId
          ? { ...c, messages: [...c.messages, userMsg, aiMsg] }
          : c
      )
    );

    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          webSearch,
          messages: history.map((m) => ({
            role: m.role,
            content: m.content,
            attachments: m.attachments?.map((a) => ({
              mediaType: a.mediaType,
              base64: a.base64,
            })),
          })),
        }),
      });

      if (!res.body) throw new Error("No response stream.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const update = (fn: (m: ChatMessage) => ChatMessage) =>
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsg.id ? fn(m) : m
                  ),
                }
              : c
          )
        );

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const line = part.replace(/^data: /, "").trim();
          if (!line) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue;
          }
          if (evt.type === "text") {
            update((m) => ({ ...m, content: m.content + evt.text }));
          } else if (evt.type === "sources") {
            update((m) => ({ ...m, sources: evt.sources }));
          } else if (evt.type === "error") {
            update((m) => ({
              ...m,
              content: m.content + `\n\n⚠️ ${evt.error}`,
            }));
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convoId
              ? {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === aiMsg.id
                      ? { ...m, content: m.content + `\n\n⚠️ ${err.message}` }
                      : m
                  ),
                }
              : c
          )
        );
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const currentModel =
    MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-main">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setImageMode(false);
        }}
        onNew={newChat}
        onDelete={deleteChat}
      />

      <main className="relative flex h-full flex-1 flex-col">
        {/* header */}
        <header className="flex items-center justify-between px-4 py-3">
          <div className={sidebarOpen ? "" : "pl-12"}>
            <button
              onClick={() => setModelMenu((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-lg font-semibold text-gray-200 hover:bg-hover"
            >
              {currentModel.label}
              <ChevronDown size={18} className="text-gray-400" />
            </button>
            {modelMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setModelMenu(false)}
                />
                <div className="absolute z-20 mt-1 w-80 rounded-2xl border border-white/10 bg-[#2a2a2a] p-1.5 shadow-2xl">
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModel(m.id);
                        setModelMenu(false);
                      }}
                      className="flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/5"
                    >
                      <div className="flex gap-3">
                        <Sparkles size={18} className="mt-0.5 text-gray-300" />
                        <div>
                          <div className="text-sm font-medium text-gray-100">
                            {m.label}
                          </div>
                          <div className="text-xs text-gray-400">
                            {m.description}
                          </div>
                        </div>
                      </div>
                      {m.id === model && (
                        <Check size={16} className="mt-1 text-gray-200" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <a
            href="https://yoojel.com"
            className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-200 hover:bg-hover"
          >
            yoojel.com
          </a>
        </header>

        {/* body */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <h1 className="mb-8 text-3xl font-semibold text-gray-100">
                {imageMode ? "Describe the image to create" : "What can I help with?"}
              </h1>
              <div className="w-full max-w-3xl">
                <Composer
                  onSend={sendMessage}
                  onStop={stop}
                  streaming={streaming}
                  webSearch={webSearch}
                  onToggleWebSearch={() => setWebSearch((v) => !v)}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <QuickAction
                  icon={<ImageIcon size={18} />}
                  label="Create an image"
                  active={imageMode}
                  onClick={() => {
                    setImageMode((v) => !v);
                    setWebSearch(false);
                  }}
                />
                <QuickAction
                  icon={<PenLine size={18} />}
                  label="Write or edit"
                  onClick={() => {
                    setImageMode(false);
                    setWebSearch(false);
                  }}
                />
                <QuickAction
                  icon={<Globe size={18} />}
                  label="Look something up"
                  active={webSearch}
                  onClick={() => {
                    setWebSearch((v) => !v);
                    setImageMode(false);
                  }}
                />
              </div>
            </div>
          ) : (
            <MessageList messages={messages} streaming={streaming} />
          )}
        </div>

        {/* composer pinned to bottom once a chat exists */}
        {messages.length > 0 && (
          <Composer
            onSend={sendMessage}
            onStop={stop}
            streaming={streaming}
            webSearch={webSearch}
            onToggleWebSearch={() => setWebSearch((v) => !v)}
          />
        )}
      </main>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm ${
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-white/15 text-gray-200 hover:bg-hover"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
