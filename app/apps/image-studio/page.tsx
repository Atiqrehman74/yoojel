"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, ImageIcon, Loader2, Paperclip, X, LibraryBig } from "lucide-react";
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

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 90; // ~3 minutes

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<SizeOption["value"]>("1:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [active, setActive] = useState<Generation | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Load persisted history from the Library so past results survive a reload.
  useEffect(() => {
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/library?kind=image", { headers });
        if (!res.ok) return;
        const data = await res.json();
        const items: Generation[] = (data.items || []).map((i: any) => ({
          id: i.id,
          prompt: i.prompt,
          src: i.url,
        }));
        setGenerations(items);
      } catch {
        // Library history is a nice-to-have -- ignore failures silently.
      }
    })();
  }, []);

  const pickAttachment = (file: File | undefined) => {
    if (!file) return;
    setAttachment(file);
    setAttachmentPreview(URL.createObjectURL(file));
  };

  const clearAttachment = () => {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachment(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const saveToLibrary = async (gen: Generation) => {
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      await fetch("/api/library", {
        method: "POST",
        headers,
        body: JSON.stringify({ kind: "image", prompt: gen.prompt, url: gen.src }),
      });
    } catch {
      // Non-critical -- the image already rendered for the user.
    }
  };

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("prompt", prompt);
      form.append("aspect_ratio", aspectRatio);
      if (attachment) form.append("image", attachment);

      const submitRes = await fetch("/api/image/submit", {
        method: "POST",
        headers: await authHeaders(),
        body: form,
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        setError(submitData.error || "Image generation failed.");
        return;
      }

      const finish = (url: string) => {
        const gen: Generation = { id: `${Date.now()}`, prompt, src: url };
        setGenerations((prev) => [gen, ...prev]);
        setActive(gen);
        saveToLibrary(gen);
        clearAttachment();
      };

      if (submitData.done) {
        if (!submitData.url) {
          setError("No image returned.");
          return;
        }
        finish(submitData.url);
        return;
      }

      const pollHeaders = await authHeaders();
      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const res = await fetch(`/api/image/result?id=${encodeURIComponent(submitData.requestId)}`, {
          headers: pollHeaders,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Image generation failed.");
          return;
        }
        if (data.status === "done") {
          if (!data.url) {
            setError("No image returned.");
            return;
          }
          finish(data.url);
          return;
        }
        if (data.status === "failed") {
          setError(data.error || "Image generation failed.");
          return;
        }
      }
      setError("Image generation timed out.");
    } catch (e: any) {
      setError(e?.message || "Image generation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/apps"
            className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
            aria-label="Back to Apps"
          >
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold">Image Studio</h1>
        </div>
        <Link
          href="/library?kind=image"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:bg-hover hover:text-gray-200"
        >
          <LibraryBig size={14} /> Library
        </Link>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* prompt + controls */}
          <div className="rounded-xl border border-white/10 bg-bubble p-4">
            {attachmentPreview && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
                <img src={attachmentPreview} alt="Attached reference" className="h-12 w-12 rounded object-cover" />
                <p className="flex-1 truncate text-xs text-gray-400">{attachment?.name}</p>
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
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }}
              placeholder={
                attachment ? "Describe how to edit this image…" : "Describe the image you want to create…"
              }
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickAttachment(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
                  aria-label="Attach a reference image"
                  title="Attach a reference image to edit"
                >
                  <Paperclip size={15} />
                </button>
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
              </div>
              <button
                onClick={generate}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                {loading ? "Generating…" : attachment ? "Edit" : "Generate"}
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

          {/* history grid -- mobile only, the sidebar covers lg+ */}
          {generations.length > 0 && (
            <div className="lg:hidden">
              <p className="mb-2 text-xs font-medium text-gray-500">History</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
        </div>

        {/* side history panel -- lg+ only */}
        {generations.length > 0 && (
          <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-64 flex-shrink-0 flex-col gap-3 overflow-y-auto lg:flex">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">History</p>
              <Link href="/library?kind=image" className="text-xs text-gray-400 hover:text-gray-200">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {generations.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActive(g)}
                  className={`aspect-square overflow-hidden rounded-lg border ${
                    active?.id === g.id ? "border-white/50" : "border-white/10 hover:border-white/25"
                  }`}
                  title={g.prompt}
                >
                  <img src={g.src} alt={g.prompt} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </aside>
        )}
      </main>
    </div>
  );
}
