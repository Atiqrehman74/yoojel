"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import { getSpeechRecognitionCtor, type SpeechRecognitionLike } from "@/lib/speechRecognition";
import type { Attachment, ChatMessage } from "@/lib/types";

export type VoiceModePhase = "listening" | "thinking" | "speaking";

const VOICE_MODE_TTS_VOICE = "Friendly_Person";
const VOICE_MODE_MAX_CHARS = 1800;
const VOICE_MODE_POLL_MS = 2000;
const VOICE_MODE_MAX_POLL_ATTEMPTS = 90;
const DEFAULT_VOICE_LANG = "en-US";

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

// Owns the entire hands-free voice conversation loop. Must be instantiated
// once in a component that never unmounts across a chat's lifecycle --
// app/page.tsx renders two separate <Composer> instances (empty state vs.
// pinned-to-bottom once messages exist), and mounting this state inside
// Composer itself meant it was wiped the moment the first message sent
// caused React to swap from one Composer instance to the other.
export function useVoiceMode({
  onSend,
  streaming,
  messages,
}: {
  onSend: (text: string, attachments: Attachment[]) => void;
  streaming: boolean;
  messages: ChatMessage[];
}) {
  const [active, setActive] = useState(false);
  const [phase, setPhase] = useState<VoiceModePhase>("listening");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waitingForReplyRef = useRef(false);
  const activeRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const currentLang = () => window.localStorage.getItem("yoojel_voice_lang") || DEFAULT_VOICE_LANG;

  const startTurn = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      setActive(false);
      return;
    }
    setPhase("listening");
    setTranscript("");
    setError(null);
    let finalTranscript = "";
    const recognition = new Ctor();
    recognition.lang = currentLang();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e: any) => {
      // Rebuild from the full results array every time rather than
      // incrementally appending via e.resultIndex -- some engines (notably
      // Android WebView) don't reliably mark only *new* entries there, and
      // re-delivering an already-finalized segment caused it to get
      // appended again on every event, producing runaway repeated text.
      let final = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) final += result[0].transcript;
        else interim += result[0].transcript;
      }
      finalTranscript = final;
      setTranscript(final + interim);
    };
    recognition.onerror = (e: any) => {
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      setError("Didn't catch that — try again.");
    };
    recognition.onend = () => {
      if (!activeRef.current) return;
      const trimmed = finalTranscript.trim();
      if (trimmed) {
        submitTurn(trimmed);
      } else {
        startTurn();
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const submitTurn = (spokenText: string) => {
    recognitionRef.current = null;
    setPhase("thinking");
    setTranscript(spokenText);
    waitingForReplyRef.current = true;
    onSend(spokenText, []);
  };

  const speakReply = async (replyText: string) => {
    const clean = stripMarkdownForSpeech(replyText);
    if (!clean) {
      if (activeRef.current) startTurn();
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
        setError(submitData.error || "Couldn't speak the reply.");
        if (activeRef.current) startTurn();
        return;
      }

      const pollHeaders = await authHeaders();
      let url: string | null = null;
      for (let attempt = 0; attempt < VOICE_MODE_MAX_POLL_ATTEMPTS; attempt++) {
        await new Promise((r) => setTimeout(r, VOICE_MODE_POLL_MS));
        if (!activeRef.current) return;
        const res = await fetch(`/api/voice/result?id=${encodeURIComponent(submitData.requestId)}`, {
          headers: pollHeaders,
        });
        const data = await res.json();
        if (!res.ok || data.status === "failed") {
          setError(data.error || "Couldn't speak the reply.");
          break;
        }
        if (data.status === "done") {
          url = data.url;
          break;
        }
      }

      if (!activeRef.current) return;
      if (!url) {
        if (activeRef.current) startTurn();
        return;
      }

      setPhase("speaking");
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        if (activeRef.current) startTurn();
      };
      audio.onerror = () => {
        if (activeRef.current) startTurn();
      };
      await audio.play();
    } catch (e: any) {
      setError(e?.message || "Couldn't speak the reply.");
      if (activeRef.current) startTurn();
    }
  };

  // Once the assistant finishes streaming a reply we triggered, speak it.
  useEffect(() => {
    if (!active || !waitingForReplyRef.current || streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    waitingForReplyRef.current = false;
    speakReply(last.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming, active, messages]);

  const start = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    setActive(true);
    activeRef.current = true;
    startTurn();
  };

  const end = () => {
    activeRef.current = false;
    setActive(false);
    waitingForReplyRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setTranscript("");
    setError(null);
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      audioRef.current?.pause();
    };
  }, []);

  return {
    active,
    phase,
    transcript,
    error,
    start,
    end,
  };
}
