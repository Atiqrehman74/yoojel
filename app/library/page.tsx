"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Download, ImageIcon, Loader2, Trash2, Video as VideoIcon, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

type Kind = "image" | "video";

type LibraryItem = {
  id: string;
  kind: Kind;
  prompt: string;
  url: string;
  created_at: string;
};

function LibraryContent() {
  const searchParams = useSearchParams();
  const initialKind: Kind = searchParams.get("kind") === "video" ? "video" : "image";

  const [kind, setKind] = useState<Kind>(initialKind);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<LibraryItem | null>(null);

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
        const res = await fetch(`/api/library?kind=${kind}`, { headers });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load your library.");
          return;
        }
        setItems(data.items || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load your library.");
      } finally {
        setLoading(false);
      }
    })();
  }, [kind]);

  const remove = async (item: LibraryItem) => {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    if (selected?.id === item.id) setSelected(null);
    try {
      const headers = await authHeaders();
      await fetch(`/api/library?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers });
    } catch {
      // Item already removed from the UI -- a failed delete just means it
      // may reappear next visit, which is an acceptable degradation here.
    }
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

        {!loading && !error && items.length === 0 && (
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

        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelected(item)}
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
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-white/10 bg-bubble"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <p className="truncate pr-4 text-sm text-gray-200">{selected.prompt}</p>
              <button onClick={() => setSelected(null)} className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-hover hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {selected.kind === "image" ? (
                <img src={selected.url} alt={selected.prompt} className="mx-auto max-h-[60vh] rounded-lg object-contain" />
              ) : (
                <video src={selected.url} controls className="mx-auto max-h-[60vh] rounded-lg" />
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
              <button
                onClick={() => remove(selected)}
                className="flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10"
              >
                <Trash2 size={13} /> Delete
              </button>
              <a
                href={selected.url}
                download
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 hover:bg-hover"
              >
                <Download size={13} /> Download
              </a>
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
