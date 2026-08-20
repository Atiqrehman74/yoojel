"use client";

import { PhoneOff } from "lucide-react";

export type VoiceModePhase = "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<VoiceModePhase, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const PHASE_RING: Record<VoiceModePhase, string> = {
  listening: "from-cyan-400/50 to-cyan-600/30",
  thinking: "from-gray-400/40 to-gray-600/20",
  speaking: "from-purple-400/50 to-purple-600/30",
};

const PHASE_LOGO_CLASS: Record<VoiceModePhase, string> = {
  listening: "voice-logo-listening",
  thinking: "voice-logo-thinking",
  speaking: "voice-logo-speaking",
};

export default function VoiceModeOverlay({
  phase,
  transcript,
  error,
  onEnd,
  onInterrupt,
}: {
  phase: VoiceModePhase;
  transcript: string;
  error: string | null;
  onEnd: () => void;
  onInterrupt: () => void;
}) {
  const interruptible = phase === "speaking";
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-main px-6 py-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <button
          onClick={interruptible ? onInterrupt : undefined}
          disabled={!interruptible}
          aria-label={interruptible ? "Interrupt and speak" : undefined}
          className={`flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br ${PHASE_RING[phase]} ${
            interruptible ? "cursor-pointer" : "cursor-default"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/yoojel-insignia.png"
            alt=""
            className={`h-24 w-24 object-contain ${PHASE_LOGO_CLASS[phase]}`}
          />
        </button>
        <p className="text-lg font-medium text-gray-200">{PHASE_LABEL[phase]}</p>
        {interruptible && (
          <p className="-mt-4 text-xs text-gray-500">Tap to interrupt</p>
        )}
        {transcript && (
          <p className="max-w-md text-center text-sm text-gray-400">{transcript}</p>
        )}
        {error && (
          <p className="max-w-md text-center text-sm text-red-300">{error}</p>
        )}
      </div>

      <button
        onClick={onEnd}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
        aria-label="End voice mode"
      >
        <PhoneOff size={24} />
      </button>
    </div>
  );
}
