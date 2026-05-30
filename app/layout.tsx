import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yoojel — AI Assistant",
  description:
    "Yoojel is an AI assistant for everyday tasks: writing, coding, research, and more. Powered by IoBM.",
  icons: {
    icon: "/yoojel-insignia.png",
    apple: "/yoojel-insignia.png",
  },
  openGraph: {
    title: "Yoojel — AI Assistant",
    description: "Yoojel is an AI assistant for everyday tasks: writing, coding, research, and more. Powered by IoBM.",
    url: "https://yoojel.vercel.app",
    siteName: "Yoojel",
    images: [{ url: "/yoojel-insignia.png", width: 512, height: 512, alt: "Yoojel" }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Yoojel — AI Assistant",
    description: "AI assistant for everyday tasks. Powered by IoBM.",
    images: ["/yoojel-insignia.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#212121",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
