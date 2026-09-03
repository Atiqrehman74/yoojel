import type { MetadataRoute } from "next";

const BASE_URL = "https://www.yoojel.com";

// Keep in sync with the Disallow list in app/robots.ts and the pages that
// were given real per-page metadata (see each app/**/page.tsx).
const ROUTES = [
  { path: "/", changeFrequency: "daily" as const, priority: 1 },
  { path: "/apps", changeFrequency: "weekly" as const, priority: 0.8 },
  { path: "/apps/corporate", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/moviemaker", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/image-studio", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/video-studio", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/voice-studio", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/coder", changeFrequency: "weekly" as const, priority: 0.7 },
  { path: "/apps/deep-research", changeFrequency: "weekly" as const, priority: 0.7 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map((route) => ({
    url: `${BASE_URL}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
