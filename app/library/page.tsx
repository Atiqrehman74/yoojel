"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  Download,
  FileArchive,
  ImageIcon,
  Loader2,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Kind = "image" | "video" | "code";
type CodeFile = { filename: string; content: string };

type MediaItem = { id: string; kind: "image" | "video"; prompt: string; url: string; created_at: string };
type CodeItem = { id: string; prompt: string; files: CodeFile[]; created_at: string };

function LibraryContent() {
  const searchParams = useSearchParams();
  const initialKind: Kind =
    searchParams.get("kind") === "video" ? "video" : searchParams.get("kind") === "code" ? "code" : "image";

  const [kind, setKind] = useState<Kind>(initialKind);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [codeItems, setCodeItems] = useState<CodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [selectedCode, setSelectedCode] = useState<CodeItem | null>(null);
  const [selectedCodeFileIndex, setSelectedCodeFileIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const headers = await authHeaders();
        if (kind === "code") {
          const res = await fetch("/api/coder/library", { headers });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Failed to load your library.");
            return;
          }
          setCodeItems(data.items || []);
        } else {
          const res = await fetch(`/api/library?kind=${kind}`, { headers });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error || "Failed to load your library.");
            return;
          }
          setMediaItems(data.items || []);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load your library.");
      } finally {
        setLoading(false);
      }
    })();
  }, [kind]);

  const removeMedia = async (item: MediaItem) => {
    setMediaItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selectedMedia?.id === item.id) setSelectedMedia(null);
    try {
      const headers = await authHeaders();
      await fetch(`/api/library?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers });
    } catch {
      // Item already removed from the UI -- a failed delete just means it
      // may reappear next visit, which is an acceptable degradation here.
    }
  };

  const removeCode = async (item: CodeItem) => {
    setCodeItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selectedCode?.id === item.id) setSelectedCode(null);
    try {
      const headers = await authHeaders();
      await fetch(`/api/coder/library?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers });
    } catch {
      // Already removed from the UI.
    }
  };

  const openCode = (item: CodeItem) => {
    setSelectedCode(item);
    setSelectedCodeFileIndex(0);
  };

  const copyActiveCodeFile = async () => {
    const f = selectedCode?.files[selectedCodeFileIndex];
    if (!f) return;
    await navigator.clipboard.writeText(f.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadCodeZip = async (item: CodeItem) => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const f of item.files) zip.file(f.filename, f.content);
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yoojel-coder-output.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link href="/apps" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Apps">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Library</h1>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex gap-1 rounded-lg border border-white/10 p-1" style={{ width: "fit-content" }}>
          <button
            onClick={() => setKind("image")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
              kind === "image" ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <ImageIcon size={13} /> Images
          </button>
          <button
            onClick={() => setKind("video")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
              kind === "video" ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <VideoIcon size={13} /> Videos
          </button>
          <button
            onClick={() => setKind("code")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs ${
              kind === "code" ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
            }`}
          >
            <Code2 size={13} /> Code
          </button>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-gray-500">
            <Loader2 size={22} className="animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && kind !== "code" && mediaItems.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            {kind === "image" ? <ImageIcon size={28} className="opacity-40" /> : <VideoIcon size={28} className="opacity-40" />}
            <p className="text-sm">
              No {kind === "image" ? "images" : "videos"} yet.{" "}
              <Link href={kind === "image" ? "/apps/image-studio" : "/apps/video-studio"} className="text-gray-300 underline">
                Create one
              </Link>
            </p>
          </div>
        )}

        {!loading && !error && kind === "code" && codeItems.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <Code2 size={28} className="opacity-40" />
            <p className="text-sm">
              No code yet.{" "}
              <Link href="/apps/coder" className="text-gray-300 underline">
                Generate some
              </Link>
            </p>
          </div>
        )}

        {!loading && kind !== "code" && mediaItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {mediaItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedMedia(item)}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 hover:border-white/25"
                title={item.prompt}
              >
                {item.kind === "image" ? (
                  <img src={item.url} alt={item.prompt} className="h-full w-full object-cover" />
                ) : (
                  <video src={item.url} className="h-full w-full object-cover" muted />
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 text-left text-[11px] text-gray-200 opacity-0 transition group-hover:opacity-100">
                  {item.prompt}
                </span>
              </button>
            ))}
          </div>
        )}

        {!loading && kind === "code" && codeItems.length > 0 && (
          <div className="flex flex-col gap-2">
            {codeItems.map((item) => (
              <div
                key={item.id}
                className="group flex items-center justify-between gap-3 rounded-lg border border-white/10 px-4 py-3 hover:border-white/25"
              >
                <button onClick={() => openCode(item)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm text-gray-200">{item.prompt}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {item.files.length} file{item.files.length === 1 ? "" : "s"} ·{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </button>
                <div className="flex flex-shrink-0 items-center gap-1">
                  <button
                    onClick={() => downloadCodeZip(item)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-hover hover:text-gray-200"
                    aria-label="Download ZIP"
                  >
                    <FileArchive size={14} />
                  </button>
                  <button
                    onClick={() => removeCode(item)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-hover hover:text-red-300"
                    aria-label="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {selectedMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-bubble"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="truncate pr-4 text-sm text-gray-200">{selectedMedia.prompt}</p>
              <button onClick={() => setSelectedMedia(null)} className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-hover hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selectedMedia.kind === "image" ? (
                <img src={selectedMedia.url} alt={selectedMedia.prompt} className="mx-auto max-h-[60vh] rounded-lg object-contain" />
              ) : (
                <video src={selectedMedia.url} controls className="mx-auto max-h-[60vh] rounded-lg" />
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                onClick={() => removeMedia(selectedMedia)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={13} /> Delete
              </button>
              <a
                href={selectedMedia.url}
                download
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-hover"
              >
                <Download size={13} /> Download
              </a>
            </div>
          </div>
        </div>
      )}

      {selectedCode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelectedCode(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-white/10 bg-bubble"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="truncate pr-4 text-sm text-gray-200">{selectedCode.prompt}</p>
              <button onClick={() => setSelectedCode(null)} className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-hover hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {selectedCode.files.map((f, i) => (
                  <button
                    key={f.filename + i}
                    onClick={() => setSelectedCodeFileIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-mono ${
                      i === selectedCodeFileIndex ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {f.filename}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyActiveCodeFile}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={() => downloadCodeZip(selectedCode)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  <FileArchive size={13} /> ZIP
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-4 text-xs leading-relaxed text-gray-200">
              <code>{selectedCode.files[selectedCodeFileIndex]?.content}</code>
            </pre>
            <div className="flex items-center justify-end border-t border-white/10 px-4 py-3">
              <button
                onClick={() => removeCode(selectedCode)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryContent />
    </Suspense>
  );
}
