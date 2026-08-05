"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Loader2, Square } from "lucide-react";
import Markdown from "@/components/Markdown";

type Depth = "quick" | "standard" | "deep";

const DEPTHS: { label: string; value: Depth; hint: string }[] = [
  { label: "Quick", value: "quick", hint: "~4 searches" },
  { label: "Standard", value: "standard", hint: "~8 searches" },
  { label: "Deep", value: "deep", hint: "~14 searches, best model" },
];

export default function DeepResearchPage() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

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
        body: JSON.stringify({ topic, depth }),
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
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder={'What do you want researched? e.g. "State of solid-state EV batteries in 2026"'}
            rows={3}
            disabled={loading}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none disabled:opacity-60"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
