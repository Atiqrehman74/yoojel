"use client";

import { useState } from "react";

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Circular author avatar. Falls back to a colored initials badge if the
// image is missing or fails to load, so a post never breaks waiting on a
// photo -- swap authorImage in lib/blog.ts and it upgrades automatically.
export default function BlogAvatar({
  src,
  name,
  size = 32,
}: {
  src?: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const dimension = { width: size, height: size };

  if (!src || failed) {
    return (
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-full bg-brand font-bold text-white"
        style={{ ...dimension, fontSize: size * 0.4 }}
      >
        {initials(name)}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      style={dimension}
      className="flex-shrink-0 rounded-full object-cover ring-1 ring-white/10"
      onError={() => setFailed(true)}
    />
  );
}
