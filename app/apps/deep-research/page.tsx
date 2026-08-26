"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Square, Paperclip, X } from "lucide-react";
import Markdown from "@/components/Markdown";

type Depth = "quick" | "standard" | "deep";

const DEPTHS: { label: string; value: Depth; hint: string }[] = [
  { label: "Quick", value: "quick", hint: "~4 searches" },
  { label: "Standard", value: "standard", hint: "~8 searches" },
  { label: "Deep", value: "deep", hint: "~14 searches, best model" },
];

const MAX_ATTACHMENT_TEXT_LENGTH = 20000;
const MAX_ATTACHMENT_IMAGE_BYTES = 10 * 1024 * 1024;
type Attachment = { name: string; mediaType: string; base64?: string; text?: string; previewUrl?: string };

export default function DeepResearchPage() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickAttachment = (file: File | undefined) => {
    if (!file) return;
    setError("");

    if (file.type.startsWith("image/")) {
      if (file.size > MAX_ATTACHMENT_IMAGE_BYTES) {
        setError("Attached image is too large (max 10MB).");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        const base64 = dataUrl.split(",")[1] || "";
        setAttachment({ name: file.name, mediaType: file.type, base64, previewUrl: dataUrl });
      };
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      if (text.length > MAX_ATTACHMENT_TEXT_LENGTH) {
        setError(`Attached file is too long (max ${MAX_ATTACHMENT_TEXT_LENGTH.toLocaleString()} characters).`);
        return;
      }
      setAttachment({ name: file.name, mediaType: file.type || "text/plain", text });
    };
    reader.readAsText(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const run = async () => {
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError("");
    setReport("");
    setSources([]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          topic,
          depth,
          ...(attachment
            ? {
                attachment: {
                  name: attachment.name,
                  mediaType: attachment.mediaType,
                  base64: attachment.base64,
                  text: attachment.text,
                },
              }
            : {}),
        }),
      });
      if (!res.body) throw new Error("No response stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

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
          if (evt.type === "text") setReport((r) => r + evt.text);
          else if (evt.type === "sources") setSources(evt.sources);
          else if (evt.type === "error") setError(evt.error);
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") setError(err?.message || "Research failed.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/apps" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Apps">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Deep Research</h1>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        <div className="rounded-xl border border-white/10 bg-bubble p-4">
          {attachment && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
              {attachment.previewUrl ? (
                <img src={attachment.previewUrl} alt={attachment.name} className="h-8 w-8 flex-shrink-0 rounded object-cover" />
              ) : (
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/10">
                  <Paperclip size={13} className="text-gray-400" />
                </div>
              )}
              <p className="flex-1 truncate text-xs text-gray-400">{attachment.name}</p>
              <button
                onClick={clearAttachment}
                className="rounded p-1 text-gray-400 hover:bg-hover hover:text-gray-200"
                aria-label="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={'What do you want researched? e.g. "State of solid-state EV batteries in 2026"'}
            rows={3}
            disabled={loading}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt,.md,.csv,.json,.log"
                className="hidden"
                onChange={(e) => pickAttachment(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200 disabled:opacity-60"
                aria-label="Attach an image or document"
                title="Attach an image or document to research alongside"
              >
                <Paperclip size={15} />
              </button>
              <div className="flex gap-1 rounded-lg border border-white/10 p-1">
                {DEPTHS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDepth(d.value)}
                    disabled={loading}
                    title={d.hint}
                    className={`rounded-md px-2.5 py-1 text-xs disabled:opacity-60 ${
                      depth === d.value ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <button
                onClick={stop}
                className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-hover"
              >
                <Square size={12} /> Stop
              </button>
            ) : (
              <button
                onClick={run}
                disabled={!topic.trim()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
              >
                <Search size={14} /> Research
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !report && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={14} className="animate-spin" /> Searching and reading sources…
          </div>
        )}

        {report && (
          <div className="rounded-xl border border-white/10 bg-bubble p-5">
            <Markdown content={report} />
          </div>
        )}

        {sources.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">Sources</p>
            <div className="flex flex-col gap-1.5">
              {sources.map((s, i) => (
                <a
                  key={s.url + i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs text-cyan-400 hover:underline"
                >
                  [{i + 1}] {s.title}
                </a>
              ))}
            </div>
          </div>
        )}

        {!loading && !report && !error && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <Search size={28} className="opacity-40" />
            <p className="text-sm">Enter a topic above to get a cited research report.</p>
          </div>
        )}
      </main>
    </div>
  );
}
