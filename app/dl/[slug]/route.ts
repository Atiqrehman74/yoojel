import { NextRequest } from "next/server";

// Proxies Muapi-hosted generated media (images/video/audio) through
// yoojel.com so the browser never shows cdn.muapi.ai -- see
// lib/muapi.ts's toDownloadUrl() for how these links get built. The slug is
// base64url(fullMuapiUrl) + a literal ".ext" suffix kept only so downloaded
// files get a sensible filename; it's stripped before decoding.
//
// The decoded host is checked against an allowlist before fetching --
// without that this would be an open SSRF proxy, since the slug is
// attacker-controllable (anyone can request any /dl/<anything> path).

export const runtime = "nodejs";

function isAllowedHost(hostname: string): boolean {
  return hostname === "muapi.ai" || hostname.endsWith(".muapi.ai");
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dot = slug.lastIndexOf(".");
  const encoded = dot > 0 ? slug.slice(0, dot) : slug;

  let target: URL;
  try {
    target = new URL(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return new Response("Invalid link.", { status: 400 });
  }

  if (target.protocol !== "https:" || !isAllowedHost(target.hostname)) {
    return new Response("Invalid link.", { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString());
  } catch {
    return new Response("Upstream fetch failed.", { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response("Not found.", { status: 404 });
  }

  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentLength = upstream.headers.get("content-length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(upstream.body, { status: 200, headers });
}
