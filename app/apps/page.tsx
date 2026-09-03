import type { Metadata } from "next";
import AppsClient from "./AppsClient";

export const metadata: Metadata = {
  title: "Apps — Yoojel",
  description:
    "The full Yoojel Apps suite: Image Studio, Video Studio, Voice Studio, Yoojel Coder, Deep Research, Yoojel Corporate, and Yoojel MovieMaker.",
  alternates: { canonical: "/apps" },
  openGraph: {
    title: "Yoojel Apps",
    description: "The full Yoojel Apps suite: image, video, voice, code, and research tools.",
    url: "https://www.yoojel.com/apps",
  },
};

export default function Page() {
  return <AppsClient />;
}
