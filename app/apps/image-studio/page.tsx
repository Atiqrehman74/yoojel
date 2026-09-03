import type { Metadata } from "next";
import ImageStudioClient from "./ImageStudioClient";

export const metadata: Metadata = {
  title: "Image Studio — AI Image Generator",
  description:
    "Generate and edit images with Yoojel's Image Studio. Describe what you want, pick a size (square, portrait, landscape, or custom), and optionally attach a reference image to edit.",
  alternates: { canonical: "/apps/image-studio" },
  openGraph: {
    title: "Yoojel Image Studio — AI Image Generator",
    description: "Generate and edit images with Yoojel's Image Studio.",
    url: "https://www.yoojel.com/apps/image-studio",
  },
};

export default function Page() {
  return <ImageStudioClient />;
}
