import type { Metadata } from "next";
import VideoStudioClient from "./VideoStudioClient";

export const metadata: Metadata = {
  title: "Video Studio — AI Video Generator",
  description:
    "Generate short videos with Yoojel's Video Studio. Text-to-video or image-to-video, up to 10 seconds, with 16:9 or 9:16 aspect ratios and adjustable resolution.",
  alternates: { canonical: "/apps/video-studio" },
  openGraph: {
    title: "Yoojel Video Studio — AI Video Generator",
    description: "Generate short videos with Yoojel's Video Studio.",
    url: "https://www.yoojel.com/apps/video-studio",
  },
};

export default function Page() {
  return <VideoStudioClient />;
}
