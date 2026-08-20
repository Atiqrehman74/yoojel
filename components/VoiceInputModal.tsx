"use client";

import { Globe, Timer, Zap, X, Mic } from "lucide-react";

export type VoiceLanguage = { label: string; code: string };

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { label: "English", code: "en-US" },
  { label: "Spanish", code: "es-ES" },
  { label: "French", code: "fr-FR" },
  { label: "German", code: "de-DE" },
  { label: "Italian", code: "it-IT" },
  { label: "Portuguese", code: "pt-PT" },
  { label: "Portuguese (Brazil)", code: "pt-BR" },
  { label: "Arabic", code: "ar-SA" },
  { label: "Urdu", code: "ur-PK" },
  { label: "Hindi", code: "hi-IN" },
  { label: "Chinese (Mandarin)", code: "zh-CN" },
  { label: "Japanese", code: "ja-JP" },
  { label: "Korean", code: "ko-KR" },
  { label: "Russian", code: "ru-RU" },
  { label: "Turkish", code: "tr-TR" },
  { label: "Dutch", code: "nl-NL" },
  { label: "Polish", code: "pl-PL" },
  { label: "Indonesian", code: "id-ID" },
  { label: "Vietnamese", code: "vi-VN" },
  { label: "Thai", code: "th-TH" },
  { label: "Bengali", code: "bn-BD" },
  { label: "Swedish", code: "sv-SE" },
  { label: "Greek", code: "el-GR" },
  { label: "Hebrew", code: "he-IL" },
  { label: "Ukrainian", code: "uk-UA" },
];

export default function VoiceInputModal({
  language,
  onLanguageChange,
  onClose,
  onContinue,
}: {
  language: string;
  onLanguageChange: (code: string) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-t-2xl bg-main p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-hover hover:text-gray-200" aria-label="Close">
          <X size={20} />
        </button>

        <div className="mt-2 flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400/30 to-orange-600/30">
            <Mic size={32} className="text-gray-200" />
          </div>
          <h2 className="mt-6 text-xl font-semibold leading-snug text-gray-100">
            Send messages to Yoojel using your voice.
          </h2>

          <div className="mt-6 flex w-full flex-col gap-4 text-left">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Globe size={18} className="flex-shrink-0 text-gray-400" />
              Choose a language to speak in
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Timer size={18} className="flex-shrink-0 text-gray-400" />
              Speak for up to 3 minutes
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Zap size={18} className="flex-shrink-0 text-gray-400" />
              Chat more quickly and naturally
            </div>
          </div>

          <div className="mt-6 w-full rounded-xl border border-white/10 bg-bubble px-4 py-3 text-left">
            <label className="text-xs text-gray-500">Speech Input Language</label>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="mt-1 w-full bg-transparent text-base text-gray-100 outline-none"
            >
              {VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-main">
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onContinue}
            className="mt-6 w-full rounded-full bg-white py-3 text-sm font-semibold text-black hover:opacity-90"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
