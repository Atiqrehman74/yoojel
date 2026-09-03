import type { Metadata } from "next";
import CorporateClient from "./CorporateClient";

export const metadata: Metadata = {
  title: "Yoojel Corporate — AI-Powered Enterprise Intelligence",
  description:
    "Yoojel Corporate is a next-generation AI-powered enterprise ecosystem that helps organizations run at the efficiency of a much larger workforce.",
  alternates: { canonical: "/apps/corporate" },
  openGraph: {
    title: "Yoojel Corporate — AI-Powered Enterprise Intelligence",
    description:
      "Redefining the future of enterprise intelligence: intelligent automation, AI-powered workflows, and digital workforce technologies.",
    url: "https://www.yoojel.com/apps/corporate",
  },
};

export default function Page() {
  return <CorporateClient />;
}
