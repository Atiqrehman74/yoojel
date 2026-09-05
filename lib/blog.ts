// Blog posts, stored as plain markdown strings rather than files-on-disk or
// a CMS -- simplest option for a launch of two posts, rendered through the
// same components/Markdown.tsx already used for chat replies. Easy to grow
// into MDX files or a database later if the blog outgrows this.

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  author: string;
  // Optional -- falls back to a colored initials avatar when unset (e.g.
  // before an author photo has been provided).
  authorImage?: string;
  coverImage: string;
  coverAlt: string;
  content: string; // markdown
}

const INTRODUCING_YOOJEL = `
Yoojel is an AI assistant for everyday tasks — writing, coding, research, image and video generation, and voice. You can start using it for free at [yoojel.com](https://www.yoojel.com), with a Pro plan available at $5/mo for higher usage limits and access to our more capable model tier.

## Built by IoBM

Yoojel is built by [IoBM](https://io-bm.com), a Dubai-based technology company founded in 2016 by Muhammad Umair Saeed, who serves as Founder, Chairman & CEO. IoBM operates across cybersecurity, automation, robotics, and a handful of other ventures — Yoojel is IoBM's product in the AI assistant space, built and maintained as its own focused application rather than a bundle of unrelated tools.

## What you can actually do with it today

Beyond the core chat, Yoojel includes a growing suite of standalone Apps, each purpose-built for a specific kind of work:

- **Image Studio** — generate and edit images, with square, portrait, landscape, and custom aspect ratios
- **Video Studio** — text-to-video or image-to-video generation
- **Voice Studio** — text-to-speech, plus voice cloning from a short reference sample
- **Yoojel Coder** — generate code with a live sandboxed preview and export to ZIP, Markdown, or PDF
- **Deep Research** — answers complex questions with real, clickable citations, free to use with no sign-in required just to research

We'll go deeper on each of these in future posts, starting with a full walkthrough of the Apps suite.

## Why we're writing this blog

We're building Yoojel quickly — new features, fixes, and refinements ship often. This blog is where we'll talk about what we're building and why, starting with the basics: what Yoojel is, right now, in plain terms.
`.trim();

const YOOJEL_APPS_SUITE = `
Yoojel's core chat handles most everyday requests on its own, but some tasks deserve a dedicated tool. That's what the Apps suite is for — five standalone apps, each focused on one kind of work, all reachable from the header or [/apps](https://www.yoojel.com/apps).

## Image Studio

[Image Studio](https://www.yoojel.com/apps/image-studio) generates and edits images from a text description. Pick from Square, Portrait, or Landscape, or open the Custom size picker for additional ratios (3:4, 4:3, 3:2, 2:3, 5:4, 4:5, and 21:9). Attach a reference image and Image Studio switches to edit mode, applying your prompt to the image you provided instead of generating from scratch.

## Video Studio

![Video Studio](/blog/video-studio.png)

[Video Studio](https://www.yoojel.com/apps/video-studio) generates short videos, either from a text prompt or from a reference image (image-to-video). Videos run up to 10 seconds, in 16:9 or 9:16, with a choice of resolution.

## Voice Studio

![Voice Studio](/blog/voice-studio.png)

[Voice Studio](https://www.yoojel.com/apps/voice-studio) turns text into natural-sounding speech. You can also clone a voice from a short reference audio sample and reuse it for future generations — cloning requires your explicit confirmation that you have the right to use the voice you're uploading, since it's a meaningfully different thing from generating a generic voice.

## Yoojel Coder

![Yoojel Coder](/blog/coder.png)

[Yoojel Coder](https://www.yoojel.com/apps/coder) generates code from a description, with a live sandboxed preview for HTML output so you can see what you're building without leaving the page. Attach an existing code or text file for context, and export your result as a copy, a ZIP, Markdown, or PDF.

## Deep Research

![Deep Research](/blog/deep-research.png)

[Deep Research](https://www.yoojel.com/apps/deep-research) answers complex questions with real, clickable citations rather than a wall of unsourced text. You can attach an image or a text file for additional context. It's free to use — you only need to sign in if you want to save your research history.

## One more thing: History and Library

Every app keeps a history panel for your own past results, and there's a shared [Library](https://www.yoojel.com/library) page with tabs across every generation type, so you don't lose track of what you've made.

That's the Apps suite as it stands today. We're actively building on top of it — if there's a specific tool or workflow you'd want to see next, we'd like to hear about it.
`.trim();

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "introducing-yoojel",
    title: "Introducing Yoojel",
    description:
      "Yoojel is an AI assistant for everyday tasks, built by IoBM. Here's what it is today, and why we're writing this blog.",
    date: "2026-09-03",
    author: "Muhammad Umair Saeed",
    authorImage: "/blog/umair-saeed.jpg",
    coverImage: "/blog/yoojel-homepage.png",
    coverAlt: "The Yoojel homepage",
    content: INTRODUCING_YOOJEL,
  },
  {
    slug: "yoojel-apps-suite",
    title: "Meet the Yoojel Apps Suite",
    description:
      "A walkthrough of Image Studio, Video Studio, Voice Studio, Yoojel Coder, and Deep Research — five focused tools built on top of Yoojel's core chat.",
    date: "2026-09-03",
    author: "Muhammad Umair Saeed",
    authorImage: "/blog/umair-saeed.jpg",
    coverImage: "/blog/image-studio.png",
    coverAlt: "The Yoojel Apps suite",
    content: YOOJEL_APPS_SUITE,
  },
];

export function getAllPosts(): BlogPost[] {
  return [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
