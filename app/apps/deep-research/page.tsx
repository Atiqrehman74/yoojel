import type { Metadata } from "next";
import DeepResearchClient from "./DeepResearchClient";

export const metadata: Metadata = {
  title: "Deep Research — AI Research Assistant",
  description:
    "Yoojel Deep Research answers complex questions with real, clickable citations. Attach an image or text file for context. Free to use — sign in only to save your history.",
  alternates: { canonical: "/apps/deep-research" },
  openGraph: {
    title: "Yoojel Deep Research — AI Research Assistant",
    description: "Answers complex questions with real, clickable citations. Free to use.",
    url: "https://www.yoojel.com/apps/deep-research",
  },
};

export default function Page() {
  return <DeepResearchClient />;
}
