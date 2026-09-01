"use client";

import Link from "next/link";
import { ArrowLeft, ImageIcon, Video, Mic, Search, Building2, Clapperboard, Code2 } from "lucide-react";

const apps = [
  {
    href: "/apps/image-studio",
    icon: ImageIcon,
    name: "Image Studio",
    description: "Generate images from a text prompt.",
    available: true,
  },
  {
    href: "/apps/coder",
    icon: Code2,
    name: "Yoojel Coder",
    description: "Generate code, copy or download as a ZIP.",
    available: true,
  },
  {
    href: "/apps/deep-research",
    icon: Search,
    name: "Deep Research",
    description: "Multi-search, cited research reports.",
    available: true,
  },
  {
    href: "/apps/video-studio",
    icon: Video,
    name: "Video Studio",
    description: "Text-to-video generation.",
    available: true,
  },
  {
    href: "/apps/corporate",
    icon: Building2,
    name: "Yoojel Corporate",
    description: "AI-powered enterprise ecosystem.",
    available: true,
  },
  {
    href: "/apps/moviemaker",
    icon: Clapperboard,
    name: "Yoojel MovieMaker",
    description: "AI-powered feature film production.",
    available: true,
  },
  {
    href: "/apps/voice-studio",
    icon: Mic,
    name: "Voice Studio",
    description: "Text-to-speech and audio generation.",
    available: true,
  },
];

export default function AppsPage() {
  return (
    <div className="min-h-screen bg-main text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
          aria-label="Back to chat"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Apps</h1>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="mb-6 text-sm text-gray-400">
          Standalone tools built on top of Yoojel.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon;
            const card = (
              <div
                className={`flex h-full flex-col gap-3 rounded-xl border border-white/10 bg-bubble p-4 transition ${
                  app.available
                    ? "cursor-pointer hover:border-white/25 hover:bg-hover"
                    : "opacity-50"
                }`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg text-white"
                  style={{ background: "linear-gradient(135deg, #06b6d4, #a855f7)" }}
                >
                  <Icon size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {app.name}
                    {!app.available && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-normal text-gray-400">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{app.description}</p>
                </div>
              </div>
            );

            return app.available && app.href ? (
              <Link key={app.name} href={app.href}>
                {card}
              </Link>
            ) : (
              <div key={app.name}>{card}</div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
