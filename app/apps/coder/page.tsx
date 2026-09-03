import type { Metadata } from "next";
import CoderClient from "./CoderClient";

export const metadata: Metadata = {
  title: "Yoojel Coder — AI Code Generator",
  description:
    "Generate and preview code with Yoojel Coder. Live sandboxed preview for HTML output, code/text attachment for context, and Copy/ZIP/Markdown/PDF export.",
  alternates: { canonical: "/apps/coder" },
  openGraph: {
    title: "Yoojel Coder — AI Code Generator",
    description: "Generate and preview code with Yoojel Coder.",
    url: "https://www.yoojel.com/apps/coder",
  },
};

export default function Page() {
  return <CoderClient />;
}
