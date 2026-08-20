"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase";

type SizeOption = { label: string; value: "1:1" | "9:16" | "16:9" };

const SIZES: SizeOption[] = [
  { label: "Square", value: "1:1" },
  { label: "Portrait", value: "9:16" },
  { label: "Landscape", value: "16:9" },
];

type Generation = {
  id: string;
  prompt: string;
  src: string;
};

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<SizeOption["value"]>("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [active, setActive] = useState<Generation | null>(null);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const res = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, aspect_ratio: aspectRatio }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Image generation failed.");
        return;
      }
      if (!data.url) {
        setError("No image returned.");
        return;
      }
      const gen: Generation = { id: `${Date.now()}`, prompt, src: data.url };
      setGenerations((prev) => [gen, ...prev]);
      setActive(gen);
    } catch (e: any) {
      setError(e?.message || "Image generation failed.");
    } finally {
      setLoading(false);
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
        <h1 className="text-sm font-semibold">Image Studio</h1>
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
            placeholder="Describe the image you want to create…"
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-white/10 p-1">
              {SIZES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setAspectRatio(s.value)}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    aspectRatio === s.value ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* active preview */}
        {active && (
          <div className="rounded-xl border border-white/10 bg-bubble p-4">
            <img src={active.src} alt={active.prompt} className="mx-auto max-h-[540px] rounded-lg object-contain" />
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
        {generations.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">This session</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {generations.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActive(g)}
                  className={`aspect-square overflow-hidden rounded-lg border ${
                    active?.id === g.id ? "border-white/50" : "border-white/10 hover:border-white/25"
                  }`}
                >
                  <img src={g.src} alt={g.prompt} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {generations.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <ImageIcon size={28} className="opacity-40" />
            <p className="text-sm">Your generated images will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
