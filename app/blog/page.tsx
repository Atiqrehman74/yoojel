import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAllPosts } from "@/lib/blog";
import BlogAvatar from "@/components/BlogAvatar";

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
  const [featured, ...rest] = posts;

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

      <main className="mx-auto max-w-4xl px-4 py-16">
        <div className="mb-14 text-center">
          <h2 className="mb-3 bg-gradient-to-r from-brand via-[#8b5cf6] to-[#38bdf8] bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Yoojel Blog
          </h2>
          <p className="text-sm text-gray-400">Product updates and feature walkthroughs from the Yoojel team.</p>
        </div>

        {featured && (
          <Link href={`/blog/${featured.slug}`} className="group mb-8 block">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-bubble transition-colors group-hover:border-white/25">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={featured.coverImage}
                alt={featured.coverAlt}
                className="h-64 w-full object-cover sm:h-80"
              />
              <div className="p-6 sm:p-8">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-brand">Latest</p>
                <h3 className="mb-2 text-2xl font-bold text-gray-100 group-hover:text-white sm:text-3xl">
                  {featured.title}
                </h3>
                <p className="mb-4 text-sm text-gray-400">{featured.description}</p>
                <div className="flex items-center gap-2.5">
                  <BlogAvatar src={featured.authorImage} name={featured.author} size={28} />
                  <span className="text-xs text-gray-400">
                    {featured.author}
                    {" — "}
                    {new Date(featured.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {rest.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-bubble transition-colors hover:border-white/25"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.coverImage} alt={post.coverAlt} className="h-40 w-full object-cover" />
                <div className="p-5">
                  <h3 className="mb-1.5 text-lg font-bold text-gray-100 group-hover:text-white">{post.title}</h3>
                  <p className="mb-3 text-sm text-gray-400">{post.description}</p>
                  <div className="flex items-center gap-2">
                    <BlogAvatar src={post.authorImage} name={post.author} size={22} />
                    <span className="text-xs text-gray-500">
                      {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
