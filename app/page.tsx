"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Sparkles,
  ImageIcon,
  PenLine,
  Globe,
  X,
  Crown,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";
import MessageList from "@/components/MessageList";
import Composer from "@/components/Composer";
import { MODELS, DEFAULT_MODEL } from "@/lib/models";
import { createClient } from "@/lib/supabase";
import type {
  Attachment,
  ChatMessage,
  Conversation,
} from "@/lib/types";
import type { Profile } from "@/lib/supabase";

const STORAGE_KEY = "yoojel-conversations";
const SEARCH_COUNT_KEY = "yoojel-search-count";
const SEARCH_LIMIT = 5;

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [modelMenu, setModelMenu] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [imageMode, setImageMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [searchCount, setSearchCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [headerProfile, setHeaderProfile] = useState<Profile | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const supabase = createClient();

  const active = conversations.find((c) => c.id === activeId) || null;
  const messages = active?.messages ?? [];

  // Open sidebar by default on desktop only
  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 768);
    const handleResize = () => {
      if (window.innerWidth >= 768) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load search count from localStorage
  useEffect(() => {
    const count = parseInt(localStorage.getItem(SEARCH_COUNT_KEY) || "0", 10);
    setSearchCount(count);
  }, []);

  // ---- load / persist conversations ----
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

  // Load profile for header display
  useEffect(() => {
    supabase.auth.getSession().then((res: any) => {
      const session = res?.data?.session;
      if (!session) return;
      const u = session.user;
      if (u) {
        setHeaderProfile({
          id: u.id, email: u.email ?? '',
          full_name: u.user_metadata?.full_name ?? null,
          plan: 'free', stripe_customer_id: null,
          stripe_subscription_id: null, message_count: 0,
          is_admin: false, created_at: u.created_at ?? '',
        });
      }
      fetch('/api/profile', { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(r => r.json())
        .then(({ profile }) => { if (profile) setHeaderProfile(profile as Profile); })
        .catch(() => {});
    });
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ---- web search toggle with limit enforcement ----
  const handleToggleWebSearch = () => {
    if (!webSearch && searchCount >= SEARCH_LIMIT) {
      setShowUpgradeModal(true);
      return;
    }
    setWebSearch((v) => !v);
    setImageMode(false);
  };

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setUpgrading(false);
    }
  };

  // ---- helpers ----
  const newChat = () => {
    setActiveId(null);
    setImageMode(false);
    closeSidebarOnMobile();
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

    // Increment search count if web search is active
    if (webSearch) {
      const newCount = searchCount + 1;
      setSearchCount(newCount);
      localStorage.setItem(SEARCH_COUNT_KEY, String(newCount));
      // Disable web search after hitting the limit
      if (newCount >= SEARCH_LIMIT) {
        setWebSearch(false);
      }
    }

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

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0];
  const searchesLeft = Math.max(0, SEARCH_LIMIT - searchCount);

  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-main">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Upgrade modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowUpgradeModal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[#2a2a2a] p-6 shadow-2xl">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-200"
            >
              <X size={18} />
            </button>
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/10">
              <Crown size={24} className="text-amber-400" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-gray-100">
              Search limit reached
            </h2>
            <p className="mb-5 text-sm text-gray-400">
              Free users get <span className="font-medium text-gray-200">{SEARCH_LIMIT} web searches</span>. Upgrade to Pro for unlimited web searches, priority responses, and more.
            </p>
            <button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="mb-2 w-full rounded-xl bg-amber-400 py-2.5 text-sm font-bold text-black hover:bg-amber-300 disabled:opacity-60"
            >
              {upgrading ? "Redirecting to checkout…" : "Upgrade to Pro"}
            </button>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="w-full rounded-xl py-2 text-sm text-gray-400 hover:text-gray-200"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((s) => !s)}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setImageMode(false);
          closeSidebarOnMobile();
        }}
        onNew={newChat}
        onDelete={deleteChat}
      />

      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* header */}
        <header className="flex items-center justify-between px-3 py-3 md:px-4">
          <div className={sidebarOpen ? "" : "pl-10 md:pl-12"}>
            <button
              onClick={() => setModelMenu((v) => !v)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-base font-semibold text-gray-200 hover:bg-hover md:px-3 md:text-lg"
            >
              <span className="max-w-[140px] truncate md:max-w-none">
                {currentModel.label}
              </span>
              <ChevronDown size={16} className="flex-shrink-0 text-gray-400" />
            </button>
            {modelMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setModelMenu(false)}
                />
                <div className="absolute z-20 mt-1 w-72 rounded-2xl border border-white/10 bg-[#2a2a2a] p-1.5 shadow-2xl md:w-80">
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
                        <Sparkles size={18} className="mt-0.5 flex-shrink-0 text-gray-300" />
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
                        <Check size={16} className="mt-1 flex-shrink-0 text-gray-200" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {headerProfile ? (
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5">
              <span className="text-sm text-gray-200 max-w-[120px] truncate">
                {headerProfile.full_name ?? headerProfile.email}
              </span>
              {headerProfile.plan === 'pro' ? (
                <span className="flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  <Crown size={10} /> Pro
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-gray-400">
                  Standard
                </span>
              )}
            </div>
          ) : (
            <a
              href="https://yoojel.com"
              className="hidden rounded-full border border-white/15 px-4 py-1.5 text-sm text-gray-200 hover:bg-hover sm:block"
            >
              yoojel.com
            </a>
          )}
        </header>

        {/* body */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4">
              <h1 className="mb-6 text-2xl font-semibold text-gray-100 md:mb-8 md:text-3xl">
                {imageMode ? "Describe the image to create" : "What can I help with?"}
              </h1>
              <div className="w-full max-w-3xl">
                <Composer
                  onSend={sendMessage}
                  onStop={stop}
                  streaming={streaming}
                  webSearch={webSearch}
                  onToggleWebSearch={handleToggleWebSearch}
                  searchesLeft={searchesLeft}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-center gap-2 md:gap-3">
                <QuickAction
                  icon={<ImageIcon size={16} />}
                  label="Create image"
                  active={imageMode}
                  onClick={() => {
                    setImageMode((v) => !v);
                    setWebSearch(false);
                  }}
                />
                <QuickAction
                  icon={<PenLine size={16} />}
                  label="Write or edit"
                  onClick={() => {
                    setImageMode(false);
                    setWebSearch(false);
                  }}
                />
                <QuickAction
                  icon={<Globe size={16} />}
                  label="Look something up"
                  active={webSearch}
                  onClick={() => {
                    handleToggleWebSearch();
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
            onToggleWebSearch={handleToggleWebSearch}
            searchesLeft={searchesLeft}
          />
        )}

        {/* Footer */}
        <div className="shrink-0 pb-safe py-2 text-center text-[11px] text-gray-600 select-none">
          Powered by 2026 —{" "}
          <a
            href="https://www.io-bm.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 transition-colors hover:text-gray-200 hover:underline"
          >
            IoBM
          </a>
        </div>
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
      className={`flex items-center gap-2 rounded-full border px-3 py-2 text-sm md:px-4 md:py-2.5 ${
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
