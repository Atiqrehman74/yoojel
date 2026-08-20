"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ArrowUp, Globe, X, Square, Mic, Check, AudioLines } from "lucide-react";
import type { Attachment, ChatMessage } from "@/lib/types";
import { createClient } from "@/lib/supabase";
import VoiceInputModal, { VOICE_LANGUAGES } from "./VoiceInputModal";
import VoiceModeOverlay, { type VoiceModePhase } from "./VoiceModeOverlay";

const VOICE_MODE_TTS_VOICE = "Friendly_Person";
const VOICE_MODE_MAX_CHARS = 1800;
const VOICE_MODE_POLL_MS = 2000;
const VOICE_MODE_MAX_POLL_ATTEMPTS = 90;

// Strips markdown formatting so the assistant's reply reads naturally aloud.
function stripMarkdownForSpeech(md: string): string {
  return md
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`#>~]/g, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .trim()
    .slice(0, VOICE_MODE_MAX_CHARS);
}

// Web Speech API isn't in TS's default DOM lib types, and only the
// webkit-prefixed constructor exists outside Chromium browsers.
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
};

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

interface Props {
  onSend: (text: string, attachments: Attachment[]) => void;
  onStop: () => void;
  streaming: boolean;
  webSearch: boolean;
  onToggleWebSearch: () => void;
  searchesLeft: number;
  messages: ChatMessage[];
}

export default function Composer({
  onSend,
  onStop,
  streaming,
  webSearch,
  onToggleWebSearch,
  searchesLeft,
  messages,
}: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const [voiceSupported, setVoiceSupported] = useState(true);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceLang, setVoiceLang] = useState(VOICE_LANGUAGES[0].code);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const textBeforeListeningRef = useRef("");

  useEffect(() => {
    setVoiceSupported(!!getSpeechRecognitionCtor());
    const savedLang = window.localStorage.getItem("yoojel_voice_lang");
    if (savedLang) setVoiceLang(savedLang);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceSupported(false);
      return;
    }
    textBeforeListeningRef.current = text;
    setInterimText("");
    const recognition = new Ctor();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      if (finalChunk) {
        setText((prev) => (prev ? `${prev} ${finalChunk}` : finalChunk).trim());
      }
      setInterimText(interimChunk);
    };
    recognition.onerror = () => {
      setListening(false);
      setInterimText("");
    };
    recognition.onend = () => {
      setListening(false);
      setInterimText("");
    };
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const finishListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
  };

  const cancelListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInterimText("");
    setText(textBeforeListeningRef.current);
  };

  const beginVoiceInput = () => {
    window.localStorage.setItem("yoojel_voice_lang", voiceLang);
    setShowVoiceModal(false);
    startListening();
  };

  // ---- Voice mode: hands-free conversation loop ----
  // listen -> auto-send -> wait for the assistant's reply to finish
  // streaming -> synthesize it via /api/voice -> play it back -> listen again.
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [voiceModePhase, setVoiceModePhase] = useState<VoiceModePhase>("listening");
  const [voiceModeTranscript, setVoiceModeTranscript] = useState("");
  const [voiceModeError, setVoiceModeError] = useState<string | null>(null);
  const voiceModeRecognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceModeAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceModeWaitingForReplyRef = useRef(false);
  const voiceModeActiveRef = useRef(false);

  useEffect(() => {
    voiceModeActiveRef.current = voiceModeActive;
  }, [voiceModeActive]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const startVoiceModeTurn = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceSupported(false);
      setVoiceModeActive(false);
      return;
    }
    setVoiceModePhase("listening");
    setVoiceModeTranscript("");
    setVoiceModeError(null);
    let finalTranscript = "";
    const recognition = new Ctor();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      let interimChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimChunk += result[0].transcript;
      }
      setVoiceModeTranscript(finalTranscript + interimChunk);
    };
    recognition.onerror = (e: any) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      setVoiceModeError("Didn't catch that — try again.");
    };
    recognition.onend = () => {
      if (!voiceModeActiveRef.current) return;
      const trimmed = finalTranscript.trim();
      if (trimmed) {
        submitVoiceModeTurn(trimmed);
      } else {
        startVoiceModeTurn();
      }
    };
    voiceModeRecognitionRef.current = recognition;
    recognition.start();
  };

  const submitVoiceModeTurn = (spokenText: string) => {
    voiceModeRecognitionRef.current = null;
    setVoiceModePhase("thinking");
    setVoiceModeTranscript(spokenText);
    voiceModeWaitingForReplyRef.current = true;
    onSend(spokenText, []);
  };

  const speakReply = async (replyText: string) => {
    const clean = stripMarkdownForSpeech(replyText);
    if (!clean) {
      if (voiceModeActiveRef.current) startVoiceModeTurn();
      return;
    }
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const submitRes = await fetch("/api/voice/submit", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt: clean, voice_id: VOICE_MODE_TTS_VOICE }),
      });
      const submitData = await submitRes.json();
      if (!submitRes.ok) {
        setVoiceModeError(submitData.error || "Couldn't speak the reply.");
        if (voiceModeActiveRef.current) startVoiceModeTurn();
        return;
      }

      const pollHeaders = await authHeaders();
      let url: string | null = null;
      for (let attempt = 0; attempt < VOICE_MODE_MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, VOICE_MODE_POLL_MS));
        if (!voiceModeActiveRef.current) return;
        const res = await fetch(`/api/voice/result?id=${encodeURIComponent(submitData.requestId)}`, {
          headers: pollHeaders,
        });
        const data = await res.json();
        if (!res.ok || data.status === "failed") {
          setVoiceModeError(data.error || "Couldn't speak the reply.");
          break;
        }
        if (data.status === "done") {
          url = data.url;
          break;
        }
      }

      if (!voiceModeActiveRef.current) return;
      if (!url) {
        if (voiceModeActiveRef.current) startVoiceModeTurn();
        return;
      }

      setVoiceModePhase("speaking");
      const audio = new Audio(url);
      voiceModeAudioRef.current = audio;
      audio.onended = () => {
        if (voiceModeActiveRef.current) startVoiceModeTurn();
      };
      audio.onerror = () => {
        if (voiceModeActiveRef.current) startVoiceModeTurn();
      };
      await audio.play();
    } catch (e: any) {
      setVoiceModeError(e?.message || "Couldn't speak the reply.");
      if (voiceModeActiveRef.current) startVoiceModeTurn();
    }
  };

  // Once the assistant finishes streaming a reply we triggered, speak it.
  useEffect(() => {
    if (!voiceModeActive || !voiceModeWaitingForReplyRef.current || streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    voiceModeWaitingForReplyRef.current = false;
    speakReply(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, voiceModeActive, messages]);

  const startVoiceMode = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setVoiceSupported(false);
      return;
    }
    setVoiceModeActive(true);
    voiceModeActiveRef.current = true;
    startVoiceModeTurn();
  };

  const endVoiceMode = () => {
    voiceModeActiveRef.current = false;
    setVoiceModeActive(false);
    voiceModeWaitingForReplyRef.current = false;
    voiceModeRecognitionRef.current?.stop();
    voiceModeRecognitionRef.current = null;
    voiceModeAudioRef.current?.pause();
    voiceModeAudioRef.current = null;
    setVoiceModeTranscript("");
    setVoiceModeError(null);
  };

  useEffect(() => {
    return () => {
      voiceModeRecognitionRef.current?.stop();
      voiceModeAudioRef.current?.pause();
    };
  }, []);

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
      <div className="relative">
      <div
        className="rounded-[22px] bg-composer p-2 md:rounded-[26px]"
        style={{
          boxShadow:
            "0 0 0 1.5px rgba(6,182,212,0.55), 0 0 18px 5px rgba(6,182,212,0.5), 0 0 50px 14px rgba(168,85,247,0.45), 0 0 90px 30px rgba(168,85,247,0.25)",
        }}
      >
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

        {listening ? (
          <div className="flex min-h-[44px] items-center gap-2 px-3 py-2 text-[15px]">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
            </span>
            <span className="text-gray-100">
              {text}
              {interimText && <span className="text-gray-500"> {interimText}</span>}
              {!text && !interimText && <span className="text-gray-500">Listening…</span>}
            </span>
          </div>
        ) : (
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
        )}

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

          {listening ? (
            <div className="flex items-center gap-1">
              <button
                onClick={cancelListening}
                className="rounded-full p-2 text-gray-300 hover:bg-white/10"
                aria-label="Cancel voice input"
              >
                <X size={18} />
              </button>
              <button
                onClick={finishListening}
                className="rounded-full bg-white p-2 text-black hover:opacity-90"
                aria-label="Done"
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
            </div>
          ) : streaming ? (
            <button
              onClick={onStop}
              className="rounded-full bg-white p-2 text-black hover:opacity-90"
              aria-label="Stop"
            >
              <Square size={16} fill="black" />
            </button>
          ) : !text.trim() && attachments.length === 0 && voiceSupported ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowVoiceModal(true)}
                className="rounded-full p-2 text-gray-300 hover:bg-white/10"
                aria-label="Voice input"
              >
                <Mic size={20} />
              </button>
              <button
                onClick={startVoiceMode}
                className="rounded-full bg-white p-2 text-black hover:opacity-90"
                aria-label="Voice mode"
              >
                <AudioLines size={20} />
              </button>
            </div>
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
      </div>
      <p className="mt-2 text-center text-xs text-gray-500">
        Yoojel can make mistakes. Check important info.
      </p>

      {showVoiceModal && (
        <VoiceInputModal
          language={voiceLang}
          onLanguageChange={setVoiceLang}
          onClose={() => setShowVoiceModal(false)}
          onContinue={beginVoiceInput}
        />
      )}

      {voiceModeActive && (
        <VoiceModeOverlay
          phase={voiceModePhase}
          transcript={voiceModePhase === "listening" ? voiceModeTranscript : ""}
          error={voiceModeError}
          onEnd={endVoiceMode}
        />
      )}
    </div>
  );
}
