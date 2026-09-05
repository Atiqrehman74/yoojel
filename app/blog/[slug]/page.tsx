import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import Markdown from "@/components/Markdown";
import BlogAvatar from "@/components/BlogAvatar";

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
      images: [{ url: post.coverImage }],
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

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.coverImage}
        alt={post.coverAlt}
        className="h-56 w-full object-cover sm:h-72 md:h-96"
      />

      <main className="mx-auto max-w-2xl px-4 py-12">
        <article>
          <h2 className="mb-4 bg-gradient-to-r from-brand via-[#8b5cf6] to-[#38bdf8] bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl">
            {post.title}
          </h2>
          <div className="mb-10 flex items-center gap-3">
            <BlogAvatar src={post.authorImage} name={post.author} size={40} />
            <div>
              <p className="text-sm font-semibold text-gray-200">{post.author}</p>
              <p className="text-xs text-gray-500">
                {new Date(post.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>
          <div className="blog-content">
            <Markdown content={post.content} />
          </div>
        </article>
      </main>
    </div>
  );
}
