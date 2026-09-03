import type { MetadataRoute } from "next";

// Private/app-internal routes have no SEO value and shouldn't be crawled --
// disallowed here rather than given a noindex meta tag, which would require
// the same server/client component split as the indexable pages for zero
// benefit.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/auth", "/auth/reset", "/library", "/projects", "/admin", "/api/"],
    },
    sitemap: "https://www.yoojel.com/sitemap.xml",
  };
}
