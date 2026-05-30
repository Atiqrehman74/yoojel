# Yoojel — ChatGPT-style AI Assistant (powered by Claude)

A complete, production-ready ChatGPT-style web app for **yoojel.com**, built with
**Next.js 14** and the **Anthropic Claude API**. Streaming responses, a model
switcher, real web search, image/file uploads (vision), Markdown + code rendering,
and a clean ChatGPT-like dark UI.

---

## ✨ Features

| Feature | Status | How it works |
|---|---|---|
| **Chat** (streaming) | ✅ | Token-by-token streaming from Claude via `/api/chat` |
| **Write or edit** | ✅ | Regular chat — Claude writes, rewrites, summarizes, edits |
| **Look something up** | ✅ | Toggles Claude's built-in **web search** tool + shows sources |
| **Vision / file upload** | ✅ | Upload images; Claude reads & analyzes them |
| **Model switcher** | ✅ | Yoojel Standard / Pro / Fast (Sonnet / Opus / Haiku) |
| **Markdown + code** | ✅ | Syntax highlighting + one-click copy |
| **Chat history** | ✅ | Saved in your browser (localStorage) |
| **Create an image** | ⚙️ Optional | Claude **cannot** generate images — drop in any image API (see below) |

---

## 🧠 About the models

Model strings live in [`lib/models.ts`](./lib/models.ts) and are current as of May 2026:

- `claude-sonnet-4-6` — **Yoojel Standard** (default, best balance)
- `claude-opus-4-8` — **Yoojel Pro** (smartest)
- `claude-haiku-4-5-20251001` — **Yoojel Fast** (lightweight)

Update this file when Anthropic releases newer models.

---

## 🚀 Quick start (local)

```bash
# 1. Install dependencies
npm install

# 2. Add your API key
cp .env.example .env.local
#   then edit .env.local and paste your key:
#   ANTHROPIC_API_KEY=sk-ant-...

# 3. Run it
npm run dev
```

Open **http://localhost:3000**.

> Get an API key at **https://console.anthropic.com** → API Keys.

---

## 📦 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Yoojel chat app"
git branch -M main
git remote add origin https://github.com/<your-username>/yoojel-chat.git
git push -u origin main
```

> ✅ `.env.local` is already in `.gitignore` — your API key will **never** be committed.

---

## ▲ Deploy to Vercel

1. Go to **https://vercel.com/new** and import your GitHub repo.
2. Framework preset: **Next.js** (auto-detected — leave defaults).
3. Under **Environment Variables**, add:

   | Key | Value |
   |---|---|
   | `ANTHROPIC_API_KEY` | `sk-ant-...` (your key) |
   | `DEFAULT_MODEL` | `claude-sonnet-4-6` *(optional)* |
   | `IMAGE_API_KEY` | *(optional — see below)* |

4. Click **Deploy**. Done. 🎉

### Connect your domain (yoojel.com)

In Vercel → your project → **Settings → Domains** → add `yoojel.com`,
then point your DNS (an `A` record / `CNAME`) as Vercel instructs.

---

## 🖼️ Enabling "Create an image" (optional)

**Claude does not generate images.** The button is wired to `/api/image`, which is a
drop-in slot for any image provider. To turn it on:

1. Pick a provider (OpenAI `gpt-image-1`, Stability, Replicate, Fal, Together, etc.).
2. Set `IMAGE_API_KEY` in your env.
3. The default code in [`app/api/image/route.ts`](./app/api/image/route.ts) calls
   OpenAI's image endpoint — swap the `fetch(...)` for your provider. Just return
   `{ url }` or `{ b64 }`.

Until configured, the button shows a friendly "not configured" message.

---

## 🗂️ Project structure

```
yoojel-chat/
├── app/
│   ├── api/
│   │   ├── chat/route.ts     # Claude streaming + web search + vision
│   │   └── image/route.ts    # optional image generation
│   ├── globals.css           # ChatGPT-style dark theme
│   ├── layout.tsx
│   └── page.tsx              # main app (state, streaming, UI)
├── components/
│   ├── Sidebar.tsx
│   ├── Composer.tsx          # input box, uploads, search toggle
│   ├── MessageList.tsx
│   └── Markdown.tsx          # markdown + code copy
├── lib/
│   ├── models.ts             # model definitions
│   └── types.ts
├── public/favicon.svg
├── .env.example
└── package.json
```

---

## 🔒 Notes & costs

- API usage is billed by Anthropic per token — see https://www.anthropic.com/pricing.
- Web search has its own per-search cost; the toggle is **off** by default.
- Chat history is stored only in the user's browser (no database). To persist
  across devices, add a DB (e.g. Vercel Postgres) — the message shape is in `lib/types.ts`.

---

Built for **yoojel.com**. Powered by **Claude**.
