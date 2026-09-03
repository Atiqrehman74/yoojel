import type { Metadata } from "next";
import MoviemakerClient from "./MoviemakerClient";

export const metadata: Metadata = {
  title: "Yoojel MovieMaker — AI Movie Creation Platform",
  description:
    "Yoojel MovieMaker is a next-generation AI-powered movie creation platform that transforms an idea, script, or vision into a cinematic production — storytelling, character development, 3D environments, animation, visual effects, sound, and post-production, up to a 240-minute feature film.",
  alternates: { canonical: "/apps/moviemaker" },
  openGraph: {
    title: "Yoojel MovieMaker — AI Movie Creation Platform",
    description: "Your story. Your vision. Your movie. The future of filmmaking is being rewritten.",
    url: "https://www.yoojel.com/apps/moviemaker",
  },
};

export default function Page() {
  return <MoviemakerClient />;
}
