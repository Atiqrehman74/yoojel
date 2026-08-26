"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Mic, Loader2, Paperclip } from "lucide-react";
import { createClient } from "@/lib/supabase";

// Keep in sync with VOICE_IDS in app/api/voice/submit/route.ts.
const VOICES = [
  { label: "Friendly", value: "Friendly_Person" },
  { label: "Wise Woman", value: "Wise_Woman" },
  { label: "Deep Voice (Man)", value: "Deep_Voice_Man" },
  { label: "Calm Woman", value: "Calm_Woman" },
  { label: "Expressive Narrator", value: "English_expressive_narrator" },
  { label: "Radiant Girl", value: "English_radiant_girl" },
  { label: "Trustworthy Man", value: "English_Trustworth_Man" },
  { label: "Upbeat Woman", value: "English_Upbeat_Woman" },
  { label: "Gentle-voiced Man", value: "English_Gentle-voiced_man" },
  { label: "Graceful Lady", value: "English_Graceful_Lady" },
  { label: "Deep-voiced Man", value: "English_ManWithDeepVoice" },
  { label: "Captivating Storyteller", value: "English_CaptivatingStoryteller" },
  { label: "Comedian", value: "English_Comedian" },
  { label: "Aussie Bloke", value: "English_Aussie_Bloke" },
];

const MAX_LENGTH = 2000;
type Generation = { id: string; prompt: string; src: string; voice: string };

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // ~3 minutes

export default function VoiceStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [voiceId, setVoiceId] = useState(VOICES[0].value);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [active, setActive] = useState<Generation | null>(null);
  const [attachmentName, setAttachmentName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickAttachment = (file: File | undefined) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "").trim();
      setPrompt(text.slice(0, MAX_LENGTH));
      setAttachmentName(file.name);
    };
    reader.readAsText(file);
  };

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
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const submitRes = await fetch("/api/voice/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, voice_id: voiceId }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        setError(submitData.error || "Voice generation failed to start.");
        return;
      }

      setStatusText("Generating audio…");
      const pollHeaders = await authHeaders();
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await fetch(`/api/voice/result?id=${encodeURIComponent(submitData.requestId)}`, {
          headers: pollHeaders,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Voice generation failed.");
          return;
        }
        if (data.status === "done") {
          if (!data.url) {
            setError("No audio returned.");
            return;
          }
          const gen: Generation = {
            id: `${Date.now()}`,
            prompt,
            src: data.url,
            voice: VOICES.find((v) => v.value === voiceId)?.label || voiceId,
          };
          setGenerations((prev) => [gen, ...prev]);
          setActive(gen);
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Voice generation failed.");
          return;
        }
      }
      setError("Voice generation timed out.");
    } catch (e: any) {
      setError(e?.message || "Voice generation failed.");
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
        <h1 className="text-sm font-semibold">Voice Studio</h1>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">
        {/* prompt + controls */}
        <div className="rounded-xl border border-white/10 bg-bubble p-4">
          {attachmentName && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
              <Paperclip size={12} className="flex-shrink-0 text-gray-400" />
              <p className="flex-1 truncate text-xs text-gray-400">Loaded from {attachmentName}</p>
            </div>
          )}
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value.slice(0, MAX_LENGTH));
              setAttachmentName("");
            }}
            placeholder="Type the text you want spoken…"
            rows={4}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          <div className="mt-1 text-right text-[11px] text-gray-500">
            {prompt.length}/{MAX_LENGTH}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md"
                className="hidden"
                onChange={(e) => pickAttachment(e.target.files?.[0])}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
                aria-label="Load text from a file"
                title="Load the text to speak from a .txt or .md file"
              >
                <Paperclip size={15} />
              </button>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#1a1a1a] px-3 py-2 text-xs text-gray-100 outline-none focus:border-brand"
              >
                {VOICES.map((v) => (
                  <option key={v.value} value={v.value}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Mic size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {statusText && (
          <div className="rounded-lg border border-white/10 bg-bubble px-3 py-2 text-sm text-gray-400">{statusText}</div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
        )}

        {/* active preview */}
        {active && (
          <div className="rounded-xl border border-white/10 bg-bubble p-4">
            <audio src={active.src} controls className="w-full" />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="truncate text-xs text-gray-400">
                {active.voice} — {active.prompt}
              </p>
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

        {/* session list */}
        {generations.length > 1 && (
          <div>
            <p className="mb-2 text-xs font-medium text-gray-500">This session</p>
            <div className="flex flex-col gap-2">
              {generations.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActive(g)}
                  className={`truncate rounded-lg border px-3 py-2 text-left text-xs ${
                    active?.id === g.id
                      ? "border-white/50 text-white"
                      : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
                  }`}
                >
                  {g.voice} — {g.prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {generations.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <Mic size={28} className="opacity-40" />
            <p className="text-sm">Your generated audio will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
