import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Yoojel — AI Assistant for Writing, Coding, Research & More",
  description:
    "Yoojel is an AI assistant for everyday tasks: writing, coding, research, image and video generation, and voice. Free to start, with a Pro plan at $5/mo.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Yoojel — AI Assistant",
    description: "An AI assistant for everyday tasks: writing, coding, research, image/video generation, and voice.",
    url: "https://www.yoojel.com",
  },
};

// Organization + SoftwareApplication structured data -- helps both classic
// Google rich results and generative answer engines (ChatGPT, Perplexity,
// Google AI Overviews) cite Yoojel's name, description, and pricing
// accurately instead of guessing from unstructured page text.
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.yoojel.com/#organization",
      name: "Yoojel",
      url: "https://www.yoojel.com",
      logo: "https://www.yoojel.com/yoojel-insignia.png",
    },
    {
      "@type": "SoftwareApplication",
      name: "Yoojel",
      url: "https://www.yoojel.com",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Yoojel is an AI assistant for everyday tasks: writing, coding, research, image and video generation, and voice. Includes a suite of standalone Apps -- Image Studio, Video Studio, Voice Studio, Yoojel Coder, and Deep Research.",
      offers: [
        {
          "@type": "Offer",
          name: "Yoojel Free",
          price: "0",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Yoojel Pro",
          price: "5",
          priceCurrency: "USD",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "5",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
      ],
    },
  ],
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}
