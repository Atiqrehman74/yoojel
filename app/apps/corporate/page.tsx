import type { Metadata } from "next";
import CorporateClient from "./CorporateClient";

export const metadata: Metadata = {
  title: "Yoojel Corporate — AI-Powered Enterprise Intelligence",
  description:
    "Yoojel Corporate is a next-generation AI-powered enterprise ecosystem that helps organizations achieve the operational capacity of a 5,000-person workforce with roughly 2,500 employees through intelligent automation and AI-powered workflows.",
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
