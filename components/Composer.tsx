"use client";

import { useRef, useState } from "react";
import { Plus, ArrowUp, Globe, X, Square } from "lucide-react";
import type { Attachment } from "@/lib/types";

interface Props {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  streaming: boolean;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  searchesLeft: number;
}

export default function Composer({
  onSend,
  onStop,
  streaming,
  webSearch,
  onToggleWebSearch,
  searchesLeft,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const next: Attachment[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      const dataUrl = await new Promise<string>((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });
      next.push({
        type: "image",
        mediaType: file.type,
        dataUrl,
        base64: dataUrl.split(",")[1],
      });
    }
    setAttachments((a) => [...a, ...next]);
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    if (streaming) return;
    onSend(trimmed, attachments);
    setText("");
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = "auto";
  };

  const searchLimitReached = searchesLeft === 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-safe-4">
      <div className="rounded-[22px] bg-composer p-2 shadow-lg md:rounded-[26px]">
        {/* attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
            {attachments.map((a, i) => (
              <div key={i} className="relative">
                <img
                  src={a.dataUrl}
                  alt="attachment"
                  className="h-14 w-14 rounded-lg object-cover md:h-16 md:w-16"
                />
                <button
                  onClick={() =>
                    setAttachments((arr) => arr.filter((_, j) => j !== i))
                  }
                  className="absolute -right-1.5 -top-1.5 rounded-full bg-black/80 p-0.5 text-white"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          ref={taRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder="Ask anything"
          className="max-h-[180px] w-full resize-none bg-transparent px-3 py-2 text-[15px] text-gray-100 placeholder-gray-500 outline-none"
        />

        <div className="flex items-center justify-between px-1 pt-1">
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-full p-2 text-gray-300 hover:bg-white/10"
              aria-label="Attach image"
            >
              <Plus size={20} />
            </button>

            {/* Web search toggle with search count badge */}
            <button
              onClick={onToggleWebSearch}
              className={`relative flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm md:px-3 ${
                webSearch
                  ? "bg-brand/20 text-brand"
                  : searchLimitReached
                  ? "text-gray-600 cursor-pointer"
                  : "text-gray-300 hover:bg-white/10"
              }`}
              title={searchLimitReached ? "Upgrade to Pro for more searches" : undefined}
            >
              <Globe size={17} />
              <span className="hidden sm:inline">Search</span>
              {/* Remaining searches badge */}
              {!webSearch && !searchLimitReached && searchesLeft <= 3 && (
                <span className="ml-0.5 rounded-full bg-gray-600 px-1.5 py-0.5 text-[10px] font-medium text-gray-300">
                  {searchesLeft}
                </span>
              )}
              {searchLimitReached && (
                <span className="ml-0.5 rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                  PRO
                </span>
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {streaming ? (
            <button
              onClick={onStop}
              className="rounded-full bg-white p-2 text-black hover:opacity-90"
              aria-label="Stop"
            >
              <Square size={16} fill="black" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!text.trim() && attachments.length === 0}
              className="rounded-full bg-white p-2 text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Send"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">
        Yoojel can make mistakes. Check important info.
      </p>
    </div>
  );
}
