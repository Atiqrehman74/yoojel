"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Code2, Copy, Check, FileArchive, Loader2, Paperclip, X } from "lucide-react";
import { createClient } from "@/lib/supabase";

type CodeFile = { filename: string; content: string };

const MAX_ATTACHMENT_LENGTH = 20000;

export default function CoderPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = files[activeIndex];

  const pickAttachment = (file: File | undefined) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || "");
      if (content.length > MAX_ATTACHMENT_LENGTH) {
        setError(`Attached file is too long (max ${MAX_ATTACHMENT_LENGTH.toLocaleString()} characters).`);
        return;
      }
      setAttachment({ name: file.name, content });
    };
    reader.readAsText(file);
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      const res = await fetch("/api/coder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          prompt,
          ...(attachment ? { attachmentName: attachment.name, attachmentContent: attachment.content } : {}),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Code generation failed.");
        return;
      }
      setFiles(result.files || []);
      setActiveIndex(0);
      clearAttachment();
    } catch (e: any) {
      setError(e?.message || "Code generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const copyActive = async () => {
    if (!active) return;
    await navigator.clipboard.writeText(active.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadZip = async () => {
    if (files.length === 0) return;
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    for (const f of files) zip.file(f.filename, f.content);
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
        <Link
          href="/apps"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
          aria-label="Back to Apps"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-semibold">Yoojel Coder</h1>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        {/* prompt + controls */}
        <div className="rounded-xl border border-white/10 bg-bubble p-4">
          {attachment && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/10">
                <Paperclip size={13} className="text-gray-400" />
              </div>
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
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                generate();
              }
            }}
            placeholder={
              attachment
                ? "Describe what to do with this file, e.g. 'refactor this to use async/await'…"
                : "Describe the code you want, e.g. 'a responsive pricing table in HTML/CSS/JS'…"
            }
            rows={3}
            className="w-full resize-none bg-transparent text-sm text-gray-100 placeholder-gray-500 outline-none"
          />
          <div className="mt-3 flex items-center justify-between">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.js,.jsx,.ts,.tsx,.py,.html,.css,.json,.csv,.yml,.yaml,.java,.c,.cpp,.cs,.go,.rb,.php,.sql,.sh,.xml"
              className="hidden"
              onChange={(e) => pickAttachment(e.target.files?.[0])}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
              aria-label="Attach a code or text file"
              title="Attach a code or text file for context"
            >
              <Paperclip size={15} />
            </button>
            <button
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Code2 size={14} />}
              {loading ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* output */}
        {files.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-bubble overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {files.map((f, i) => (
                  <button
                    key={f.filename + i}
                    onClick={() => setActiveIndex(i)}
                    className={`rounded-md px-2.5 py-1 text-xs font-mono ${
                      i === activeIndex ? "bg-white/15 text-white" : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {f.filename}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={copyActive}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadZip}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  <FileArchive size={13} />
                  Download ZIP
                </button>
              </div>
            </div>
            <pre className="max-h-[600px] overflow-auto p-4 text-xs leading-relaxed text-gray-200">
              <code>{active?.content}</code>
            </pre>
          </div>
        )}

        {files.length === 0 && !loading && !error && (
          <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
            <Code2 size={28} className="opacity-40" />
            <p className="text-sm">Your generated code will show up here.</p>
          </div>
        )}
      </main>
    </div>
  );
}
