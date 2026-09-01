"use client";

import { PhoneOff } from "lucide-react";

export type VoiceModePhase = "listening" | "thinking" | "speaking";

const PHASE_LABEL: Record<VoiceModePhase, string> = {
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

const PHASE_ORB_CLASS: Record<VoiceModePhase, string> = {
  listening: "siri-orb-listening",
  thinking: "siri-orb-thinking",
  speaking: "siri-orb-speaking",
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
    <div className="bg-glow fixed inset-0 z-50 flex flex-col items-center justify-between px-6 py-16">
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <button
          onClick={interruptible ? onInterrupt : undefined}
          disabled={!interruptible}
          aria-label={interruptible ? "Interrupt and speak" : undefined}
          className={`siri-orb ${PHASE_ORB_CLASS[phase]} ${interruptible ? "cursor-pointer" : "cursor-default"}`}
        >
          <span className="siri-blob siri-blob-a" />
          <span className="siri-blob siri-blob-b" />
          <span className="siri-blob siri-blob-c" />
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
