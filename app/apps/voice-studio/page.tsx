import type { Metadata } from "next";
import VoiceStudioClient from "./VoiceStudioClient";

export const metadata: Metadata = {
  title: "Voice Studio — AI Text-to-Speech & Voice Cloning",
  description:
    "Turn text into natural-sounding speech with Yoojel's Voice Studio, or clone a voice from a short reference sample and reuse it for future generations.",
  alternates: { canonical: "/apps/voice-studio" },
  openGraph: {
    title: "Yoojel Voice Studio — AI Text-to-Speech & Voice Cloning",
    description: "Turn text into natural-sounding speech, or clone a voice with Yoojel's Voice Studio.",
    url: "https://www.yoojel.com/apps/voice-studio",
  },
};

export default function Page() {
  return <VoiceStudioClient />;
}
