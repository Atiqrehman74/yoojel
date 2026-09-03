import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import Markdown from "@/components/Markdown";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return {
    title: `${post.title} — Yoojel Blog`,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.yoojel.com/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="bg-glow min-h-screen text-gray-100">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <Link
          href="/blog"
          className="rounded-lg p-1.5 text-gray-400 hover:bg-hover hover:text-gray-200"
          aria-label="Back to Blog"
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="text-sm font-bold">Blog</h1>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12">
        <article>
          <h2 className="mb-2 text-3xl font-bold leading-tight">{post.title}</h2>
          <p className="mb-8 text-sm text-gray-500">
            {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            {" — "}
            {post.author}
          </p>
          <Markdown content={post.content} />
        </article>
      </main>
    </div>
  );
}
