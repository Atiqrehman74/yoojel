"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Loader2,
  Square,
  Paperclip,
  X,
  Copy,
  Check,
  FileText,
  FileDown,
  LibraryBig,
} from "lucide-react";
import Markdown from "@/components/Markdown";
import { createClient } from "@/lib/supabase";

type Depth = "quick" | "standard" | "deep";
type Source = { title: string; url: string };

const DEPTHS: { label: string; value: Depth; hint: string }[] = [
  { label: "Quick", value: "quick", hint: "~4 searches" },
  { label: "Standard", value: "standard", hint: "~8 searches" },
  { label: "Deep", value: "deep", hint: "~14 searches, best model" },
];

const MAX_ATTACHMENT_TEXT_LENGTH = 20000;
const MAX_ATTACHMENT_IMAGE_BYTES = 10 * 1024 * 1024;
type Attachment = { name: string; mediaType: string; base64?: string; text?: string; previewUrl?: string };
type HistoryItem = { id: string; topic: string; depth: string; report: string; sources: Source[]; created_at: string };

function reportToMarkdown(topic: string, report: string, sources: Source[]): string {
  const sourceLines = sources.map((s, i) => `${i + 1}. [${s.title}](${s.url})`).join("\n");
  return `# ${topic}\n\n${report}${sourceLines ? `\n\n## Sources\n\n${sourceLines}` : ""}`;
}

// Word-wraps text onto the PDF, rendering any [n] citation token as a
// clickable link to sources[n-1] -- the actual point of a "PDF with links"
// export rather than just dumping plain text.
function renderLinkedParagraph(
  doc: any,
  text: string,
  x: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  pageHeight: number,
  marginTop: number,
  sources: Source[]
): number {
  let y = startY;
  let cursorX = x;
  const words = text.split(/\s+/).filter(Boolean);

  for (const word of words) {
    const citation = word.match(/^\[(\d+)\](.*)$/);
    const link = citation && sources[parseInt(citation[1], 10) - 1] ? sources[parseInt(citation[1], 10) - 1].url : null;
    const wordWidth = doc.getTextWidth(`${word} `);

    if (cursorX + wordWidth > x + maxWidth) {
      y += lineHeight;
      cursorX = x;
    }
    if (y > pageHeight - marginTop) {
      doc.addPage();
      y = marginTop;
      cursorX = x;
    }

    if (link) {
      doc.setTextColor(37, 99, 235);
      doc.textWithLink(word, cursorX, y, { url: link });
      doc.setTextColor(20, 20, 20);
    } else {
      doc.text(word, cursorX, y);
    }
    cursorX += wordWidth;
  }
  return y + lineHeight;
}

export default function DeepResearchPage() {
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState<Depth>("standard");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [error, setError] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/research/library", { headers: await authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        setHistory(data.items || []);
      } catch {
        // History is a nice-to-have -- ignore failures silently (also
        // covers the "not signed in" case, since research itself is open).
      }
    })();
  }, []);

  const saveToLibrary = async (t: string, d: Depth, r: string, s: Source[]) => {
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const res = await fetch("/api/research/library", {
        method: "POST",
        headers,
        body: JSON.stringify({ topic: t, depth: d, report: r, sources: s }),
      });
      const data = await res.json();
      if (res.ok && data.item) {
        setHistory((prev) => [data.item, ...prev]);
        setActiveHistoryId(data.item.id);
      }
    } catch {
      // Non-critical -- the report already rendered for the user.
    }
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setTopic(item.topic);
    setReport(item.report);
    setSources(item.sources);
    setActiveHistoryId(item.id);
    setError("");
  };

  const deleteHistoryItem = async (item: HistoryItem) => {
    setHistory((prev) => prev.filter((h) => h.id !== item.id));
    if (activeHistoryId === item.id) setActiveHistoryId(null);
    try {
      const headers = await authHeaders();
      await fetch(`/api/research/library?id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers });
    } catch {
      // Already removed from the UI.
    }
  };

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
    setActiveHistoryId(null);

    const controller = new AbortController();
    abortRef.current = controller;
    const runTopic = topic;

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
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
      let finalReport = "";
      let finalSources: Source[] = [];

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
          if (evt.type === "text") {
            finalReport += evt.text;
            setReport((r) => r + evt.text);
          } else if (evt.type === "sources") {
            finalSources = evt.sources;
            setSources(evt.sources);
          } else if (evt.type === "error") setError(evt.error);
        }
      }

      if (finalReport.trim()) saveToLibrary(runTopic, depth, finalReport, finalSources);
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

  const copyReport = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(reportToMarkdown(topic, report, sources));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const downloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([reportToMarkdown(topic, report, sources)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yoojel-research.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPdf = async () => {
    if (!report) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginX = 40;
    const marginTop = 50;
    const lineHeight = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;

    let y = marginTop;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    const titleLines = doc.splitTextToSize(topic, maxWidth) as string[];
    doc.text(titleLines, marginX, y);
    y += titleLines.length * 20 + 10;

    doc.setFontSize(10);
    for (const rawLine of report.split("\n")) {
      const line = rawLine.trim();
      if (!line) {
        y += lineHeight * 0.6;
        continue;
      }
      if (y > pageHeight - marginTop) {
        doc.addPage();
        y = marginTop;
      }

      const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
      const bulletMatch = line.match(/^[-*]\s+(.*)$/);
      const plain = line.replace(/\*\*(.*?)\*\*/g, "$1");

      if (headingMatch) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(headingMatch[1].length <= 2 ? 13 : 11);
        y = renderLinkedParagraph(doc, plain.replace(/^#{1,6}\s+/, ""), marginX, y, maxWidth, lineHeight, pageHeight, marginTop, sources);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
      } else if (bulletMatch) {
        doc.text("•", marginX, y);
        y = renderLinkedParagraph(doc, bulletMatch[1].replace(/\*\*(.*?)\*\*/g, "$1"), marginX + 14, y, maxWidth - 14, lineHeight, pageHeight, marginTop, sources);
      } else {
        y = renderLinkedParagraph(doc, plain, marginX, y, maxWidth, lineHeight, pageHeight, marginTop, sources);
      }
    }

    if (sources.length > 0) {
      y += lineHeight;
      if (y > pageHeight - marginTop) {
        doc.addPage();
        y = marginTop;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Sources", marginX, y);
      y += lineHeight * 1.4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      sources.forEach((s, i) => {
        if (y > pageHeight - marginTop) {
          doc.addPage();
          y = marginTop;
        }
        doc.setTextColor(37, 99, 235);
        doc.textWithLink(`[${i + 1}] ${s.title}`, marginX, y, { url: s.url });
        doc.setTextColor(20, 20, 20);
        y += lineHeight;
      });
    }

    doc.save("yoojel-research.pdf");
  };

  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/apps" className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Back to Apps">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-sm font-bold">Deep Research</h1>
        </div>
        <Link
          href="/library?kind=research"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-400 hover:bg-hover hover:text-gray-200"
        >
          <LibraryBig size={14} /> Library
        </Link>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
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
              <div className="mb-3 flex items-center justify-end gap-1.5 border-b border-white/10 pb-3">
                <button
                  onClick={copyReport}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  <FileText size={13} /> MD
                </button>
                <button
                  onClick={downloadPdf}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-gray-300 hover:bg-hover"
                >
                  <FileDown size={13} /> PDF
                </button>
              </div>
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
                    {h.topic}
                  </button>
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
        </div>

        {/* side history panel -- lg+ only */}
        {history.length > 0 && (
          <aside className="sticky top-6 hidden max-h-[calc(100vh-3rem)] w-72 flex-shrink-0 flex-col gap-2 overflow-y-auto lg:flex">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">History</p>
              <Link href="/library?kind=research" className="text-xs text-gray-400 hover:text-gray-200">
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
                  <p className="truncate text-xs text-gray-200">{h.topic}</p>
                  <p className="mt-0.5 text-[10px] text-gray-500">{h.depth} · {new Date(h.created_at).toLocaleDateString()}</p>
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
    </div>
  );
}
