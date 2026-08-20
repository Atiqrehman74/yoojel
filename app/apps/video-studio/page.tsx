"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Video as VideoIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

type AspectOption = { label: string; value: "16:9" | "9:16" };
const ASPECTS: AspectOption[] = [
  { label: "Landscape", value: "16:9" },
  { label: "Portrait", value: "9:16" },
];

type DurationOption = { label: string; value: 5 | 10 };
const DURATIONS: DurationOption[] = [
  { label: "5s", value: 5 },
  { label: "10s", value: 10 },
];

type Generation = { id: string; prompt: string; src: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 150; // ~5 minutes

export default function VideoStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectOption["value"]>("16:9");
  const [duration, setDuration] = useState<DurationOption["value"]>(5);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [active, setActive] = useState<Generation | null>(null);
  const cancelRef = useRef(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    setStatusText("Submitting…");
    cancelRef.current = false;
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const submitRes = await fetch("/api/video/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio, duration }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        setError(submitData.error || "Video generation failed to start.");
        return;
      }

      setStatusText("Generating video… this can take a couple of minutes.");
      const pollHeaders = await authHeaders();
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        if (cancelRef.current) return;
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await fetch(`/api/video/result?id=${encodeURIComponent(submitData.requestId)}`, {
          headers: pollHeaders,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Video generation failed.");
          return;
        }
        if (data.status === "done") {
          if (!data.url) {
            setError("No video returned.");
            return;
          }
          const gen: Generation = { id: `${Date.now()}`, prompt, src: data.url };
          setGenerations((prev) => [gen, ...prev]);
          setActive(gen);
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Video generation failed.");
          return;
        }
      }
      setError("Video generation timed out.");
    } catch (e: any) {
      setError(e?.message || "Video generation failed.");
    } finally {
      setLoading(false);
      setStatusText("");
    }
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/apps"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
          aria-label="Back to Apps"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Video Studio</h1>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        {/* prompt + controls */}
        <div className="rounded-xl border border-white/10 bg-bubble p-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                generate();
              }
            }}
            placeholder="Describe the video you want to create…"
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1 rounded-lg border border-white/10 p-1">
                {ASPECTS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => setAspectRatio(a.value)}
                    className={`rounded-md px-2.5 py-1 text-xs ${
                      aspectRatio === a.value ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-1 rounded-lg border border-white/10 p-1">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`rounded-md px-2.5 py-1 text-xs ${
                      duration === d.value ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <VideoIcon size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {statusText && (
          <div className="rounded-lg border border-white/10 bg-bubble px-3 py-2 text-sm text-gray-400">
            {statusText}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* active preview */}
        {active && (
          <div className="rounded-xl border border-white/10 bg-bubble p-4">
            <video src={active.src} controls className="mx-auto max-h-[540px] rounded-lg" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="truncate text-xs text-gray-400">{active.prompt}</p>
              <a
                href={active.src}
                download
                className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-hover"
              >
                <Download size={13} /> Download
              </a>
            </div>
          </div>
        )}

        {/* session gallery */}
        {generations.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">This session</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {generations.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActive(g)}
                  className={`aspect-video overflow-hidden rounded-lg border ${
                    active?.id === g.id ? "border-white/50" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <video src={g.src} className="h-full w-full object-cover" muted />
                </button>
              ))}
            </div>
          </div>
        )}

        {generations.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <VideoIcon size={28} className="opacity-40" />
            <p className="text-sm">Your generated videos will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
