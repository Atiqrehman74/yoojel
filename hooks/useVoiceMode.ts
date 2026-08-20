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
const MIN_CHUNK_CHARS = 8;
const FORCE_FLUSH_CHARS = 260; // don't let one chunk grow unbounded on punctuation-sparse text

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

// Index just past the last sentence-ending punctuation in s, or -1 if none.
// Covers Latin/Urdu/Arabic/CJK terminators since voice mode supports many
// languages via the same picker as dictation.
function sentenceBoundary(s: string): number {
  const re = /[.!?؟۔。！？]+/g;
  let last = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) last = m.index + m[0].length;
  return last;
}

// Owns the entire hands-free voice conversation loop. Must be instantiated
// once in a component that never unmounts across a chat's lifecycle --
// app/page.tsx renders two separate <Composer> instances (empty state vs.
// pinned-to-bottom once messages exist), and mounting this state inside
// Composer itself meant it was wiped the moment the first message sent
// caused React to swap from one Composer instance to the other.
//
// Reply speech is pipelined sentence-by-sentence rather than waiting for
// the full reply to finish streaming and then synthesizing it all in one
// TTS call: as soon as a complete sentence appears in the streamed text,
// it's queued for TTS immediately, so the user hears the first sentence
// while the rest of the reply is still being generated/synthesized. This
// is the biggest lever available for perceived latency without a
// real-time streaming STT/TTS backend (see the RealtimeVoiceChat
// discussion -- that requires a self-hosted GPU server; this doesn't).
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

  // Streaming-reply TTS pipeline state.
  const spokenLengthRef = useRef(0);
  const chunkQueueRef = useRef<string[]>([]);
  const processingQueueRef = useRef(false);
  const replyDoneRef = useRef(false);

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
    spokenLengthRef.current = 0;
    chunkQueueRef.current = [];
    replyDoneRef.current = false;
    onSend(spokenText, []);
  };

  // Synthesizes and plays exactly one queued chunk, then advances the queue.
  const processQueue = async () => {
    if (processingQueueRef.current) return;
    if (chunkQueueRef.current.length === 0) {
      if (replyDoneRef.current && activeRef.current) startTurn();
      return;
    }
    processingQueueRef.current = true;
    const chunk = chunkQueueRef.current.shift()!;
    const clean = stripMarkdownForSpeech(chunk);
    if (!clean) {
      processingQueueRef.current = false;
      processQueue();
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
        processingQueueRef.current = false;
        if (activeRef.current) processQueue();
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
        processingQueueRef.current = false;
        if (activeRef.current) processQueue();
        return;
      }

      setPhase("speaking");
      const audio = new Audio(url);
      audioRef.current = audio;
      const advance = () => {
        processingQueueRef.current = false;
        audioRef.current = null;
        if (activeRef.current) processQueue();
      };
      audio.onended = advance;
      audio.onerror = advance;
      await audio.play();
    } catch (e: any) {
      setError(e?.message || "Couldn't speak the reply.");
      processingQueueRef.current = false;
      if (activeRef.current) processQueue();
    }
  };

  // As the assistant's reply streams in, peel off complete sentences and
  // queue them for TTS immediately rather than waiting for the full reply.
  useEffect(() => {
    if (!active || !waitingForReplyRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;

    const content = last.content;
    const unspoken = content.slice(spokenLengthRef.current);
    const boundary = sentenceBoundary(unspoken);
    if (boundary > 0 && unspoken.slice(0, boundary).trim().length >= MIN_CHUNK_CHARS) {
      const chunk = unspoken.slice(0, boundary);
      spokenLengthRef.current += chunk.length;
      chunkQueueRef.current.push(chunk);
      processQueue();
    } else if (unspoken.length >= FORCE_FLUSH_CHARS) {
      spokenLengthRef.current += unspoken.length;
      chunkQueueRef.current.push(unspoken);
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, active]);

  // Once streaming finishes, flush whatever's left (a trailing sentence
  // with no terminal punctuation, or a very short reply) and mark the
  // pipeline done so the queue draining back to listening.
  useEffect(() => {
    if (!active || !waitingForReplyRef.current || streaming) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    waitingForReplyRef.current = false;
    replyDoneRef.current = true;
    const remaining = last.content.slice(spokenLengthRef.current).trim();
    if (remaining) {
      spokenLengthRef.current = last.content.length;
      chunkQueueRef.current.push(remaining);
    }
    processQueue();
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
    replyDoneRef.current = false;
    chunkQueueRef.current = [];
    processingQueueRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    setTranscript("");
    setError(null);
  };

  // Tap-to-interrupt: cut off playback (and anything still queued) and
  // start listening immediately, mirroring "jump in anytime" -- without a
  // persistent connection we can't reliably listen *while* audio is
  // playing (the mic would pick up our own TTS through the speakers), so
  // this is an explicit tap rather than true voice barge-in.
  const interrupt = () => {
    if (phase !== "speaking") return;
    chunkQueueRef.current = [];
    processingQueueRef.current = false;
    waitingForReplyRef.current = false;
    audioRef.current?.pause();
    audioRef.current = null;
    if (activeRef.current) startTurn();
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
    interrupt,
  };
}
