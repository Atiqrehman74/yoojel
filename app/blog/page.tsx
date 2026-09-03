import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog — Yoojel",
  description: "Product updates, feature walkthroughs, and news from the Yoojel team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Yoojel Blog",
    description: "Product updates, feature walkthroughs, and news from the Yoojel team.",
    url: "https://www.yoojel.com/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();
  return (
    <div className="bg-glow min-h-screen text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
          aria-label="Back to Yoojel"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Blog</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <h2 className="mb-2 text-3xl font-bold">Yoojel Blog</h2>
        <p className="mb-10 text-sm text-gray-400">Product updates and feature walkthroughs from the Yoojel team.</p>

        <div className="flex flex-col gap-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="rounded-xl border border-white/10 bg-bubble p-5 transition-colors hover:border-white/25"
            >
              <p className="mb-1 text-xs text-gray-500">
                {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h3 className="mb-1.5 text-lg font-bold text-gray-100">{post.title}</h3>
              <p className="text-sm text-gray-400">{post.description}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
