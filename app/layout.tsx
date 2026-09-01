import type { Metadata, Viewport } from "next";
import { Quicksand } from "next/font/google";
import "./globals.css";

const quicksand = Quicksand({
  subsets: ["latin"],
  weight: "variable",
  variable: "--font-quicksand",
});

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
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={quicksand.variable}>
      <body>{children}</body>
    </html>
  );
}
