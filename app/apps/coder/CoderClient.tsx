"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Code2,
  Copy,
  Check,
  FileArchive,
  FileText,
  FileDown,
  Play,
  Loader2,
  Paperclip,
  X,
  LibraryBig,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type CodeFile = { filename: string; content: string };
type HistoryItem = { id: string; prompt: string; files: CodeFile[]; created_at: string };

const MAX_ATTACHMENT_LENGTH = 20000;

const LANG_BY_EXT: Record<string, string> = {
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  html: "html",
  htm: "html",
  css: "css",
  json: "json",
  java: "java",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  go: "go",
  rb: "ruby",
  php: "php",
  sql: "sql",
  sh: "bash",
  xml: "xml",
  yml: "yaml",
  yaml: "yaml",
};

function langForFile(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return LANG_BY_EXT[ext] || "";
}

function buildPreviewDoc(files: CodeFile[]): string | null {
  const htmlFile = files.find((f) => /\.html?$/i.test(f.filename));
  if (!htmlFile) return null;
  const css = files
    .filter((f) => /\.css$/i.test(f.filename))
    .map((f) => f.content)
    .join("\n");
  const js = files
    .filter((f) => /\.js$/i.test(f.filename))
    .map((f) => f.content)
    .join("\n");

  let doc = htmlFile.content;
  if (css) {
    const styleTag = `<style>\n${css}\n</style>`;
    doc = doc.includes("</head>") ? doc.replace("</head>", `${styleTag}\n</head>`) : `${styleTag}\n${doc}`;
  }
  if (js) {
    const scriptTag = `<script>\n${js}\n</script>`;
    doc = doc.includes("</body>") ? doc.replace("</body>", `${scriptTag}\n</body>`) : `${doc}\n${scriptTag}`;
  }
  return doc;
}

export default function CoderPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<CodeFile[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [attachment, setAttachment] = useState<{ name: string; content: string } | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const active = files[activeIndex];
  const previewDoc = buildPreviewDoc(files);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/coder/library", { headers: await authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setHistory(data.items || []);
      } catch {
        // History is a nice-to-have -- ignore failures silently.
      }
    })();
  }, []);

  const saveToLibrary = async (p: string, f: CodeFile[]) => {
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch("/api/coder/library", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: p, files: f }),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setHistory((prev) => [data.item, ...prev]);
        setActiveHistoryId(data.item.id);
      }
    } catch {
      // Non-critical -- the code already rendered for the user.
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setFiles(item.files);
    setActiveIndex(0);
    setActiveHistoryId(item.id);
    setPreviewOpen(false);
    setError("");
  };

  const deleteHistoryItem = async (item: HistoryItem) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (activeHistoryId === item.id) setActiveHistoryId(null);
    try {
      const headers = await authHeaders();
      await fetch(`/api/coder/library?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers });
    } catch {
      // Already removed from the UI.
    }
  };

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
    setPreviewOpen(false);
    try {
      const res = await fetch("/api/coder", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
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
      const newFiles: CodeFile[] = result.files || [];
      setFiles(newFiles);
      setActiveIndex(0);
      clearAttachment();
      if (newFiles.length > 0) saveToLibrary(prompt, newFiles);
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

  const downloadMarkdown = () => {
    if (files.length === 0) return;
    const md = files
      .map((f) => `## ${f.filename}\n\n\`\`\`${langForFile(f.filename)}\n${f.content}\n\`\`\``)
      .join("\n\n");
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yoojel-coder-output.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (files.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const marginTop = 50;
    const lineHeight = 12;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;

    let y = marginTop;
    files.forEach((f, i) => {
      if (i > 0) {
        doc.addPage();
        y = marginTop;
      }
      doc.setFont("courier", "bold");
      doc.setFontSize(12);
      doc.text(f.filename, marginX, y);
      y += lineHeight * 1.5;

      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const rawLines = f.content.split("\n");
      for (const rawLine of rawLines) {
        const wrapped = doc.splitTextToSize(rawLine || " ", maxWidth) as string[];
        for (const line of wrapped) {
          if (y > pageHeight - marginTop) {
            doc.addPage();
            y = marginTop;
          }
          doc.text(line, marginX, y);
          y += lineHeight;
        }
      }
    });

    doc.save("yoojel-coder-output.pdf");
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
          <h1 className="text-sm font-bold">Yoojel Coder</h1>
        </div>
        <Link
          href="/library?kind=code"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:bg-hover hover:text-gray-200"
        >
          <LibraryBig size={14} /> Library
        </Link>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
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
                <div className="flex flex-wrap items-center gap-1.5">
                  {previewDoc && (
                    <button
                      onClick={() => setPreviewOpen(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                    >
                      <Play size={13} />
                      Preview
                    </button>
                  )}
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
                    ZIP
                  </button>
                  <button
                    onClick={downloadMarkdown}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                  >
                    <FileText size={13} />
                    MD
                  </button>
                  <button
                    onClick={downloadPdf}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                  >
                    <FileDown size={13} />
                    PDF
                  </button>
                </div>
              </div>
              <pre className="max-h-[600px] overflow-auto p-4 text-xs leading-relaxed text-gray-200">
                <code>{active?.content}</code>
              </pre>
            </div>
          )}

          {/* history -- mobile only, the sidebar covers lg+ */}
          {history.length > 0 && (
            <div className="lg:hidden">
              <p className="mb-2 text-xs font-medium text-gray-500">History</p>
              <div className="flex flex-col gap-1.5">
                {history.map((h) => (
                  <button
                    key={h.id}
                    onClick={() => loadHistoryItem(h)}
                    className={`truncate rounded-lg border px-3 py-2 text-left text-xs ${
                      activeHistoryId === h.id
                        ? "border-white/50 text-white"
                        : "border-white/10 text-gray-400 hover:border-white/25 hover:text-gray-200"
                    }`}
                  >
                    {h.prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && !loading && !error && (
            <div className="flex flex-col items-center gap-2 py-16 text-center text-gray-500">
              <Code2 size={28} className="opacity-40" />
              <p className="text-sm">Your generated code will show up here.</p>
            </div>
          )}
        </div>

        {/* side history panel -- lg+ only */}
        {history.length > 0 && (
          <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-72 flex-shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">History</p>
              <Link href="/library?kind=code" className="text-xs text-gray-400 hover:text-gray-200">
                View all
              </Link>
            </div>
            {history.map((h) => (
              <div
                key={h.id}
                className={`group flex items-start gap-1.5 rounded-lg border px-3 py-2 ${
                  activeHistoryId === h.id ? "border-white/50" : "border-white/10 hover:border-white/25"
                }`}
              >
                <button onClick={() => loadHistoryItem(h)} className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs text-gray-200">{h.prompt}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {h.files.length} file{h.files.length === 1 ? "" : "s"}
                  </p>
                </button>
                <button
                  onClick={() => deleteHistoryItem(h)}
                  className="flex-shrink-0 rounded p-1 text-gray-500 opacity-0 hover:bg-hover hover:text-red-300 group-hover:opacity-100"
                  aria-label="Delete"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </aside>
        )}
      </main>

      {previewOpen && previewDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between border-b border-white/10 bg-main px-4 py-3">
            <p className="text-sm font-semibold">Preview</p>
            <button
              onClick={() => setPreviewOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
          <iframe
            title="Code preview"
            srcDoc={previewDoc}
            sandbox="allow-scripts allow-modals allow-forms"
            className="flex-1 border-0 bg-white"
          />
        </div>
      )}
    </div>
  );
}
