import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireProUser } from "@/lib/requireProUser";

// Backs Yoojel Coder's history panel and the Library page's "Code" tab --
// same shape as app/api/library/route.ts for images/videos, but stores a
// {filename, content}[] array per generation instead of a single url.

export const runtime = "nodejs";

const LIST_LIMIT = 60;
const MAX_FILES = 20;
const MAX_TOTAL_CONTENT_LENGTH = 200000;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await admin()
    .from("code_generations")
    .select("id, prompt, files, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    console.error("code_generations GET error:", error.message);
    return jsonError("Failed to load code library.", 500);
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { prompt, files } = await req.json().catch(() => ({}));
  if (typeof prompt !== "string" || !prompt) {
    return jsonError("Missing prompt.", 400);
  }
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_FILES) {
    return jsonError("Missing or invalid files.", 400);
  }
  const totalLength = files.reduce((sum: number, f: any) => sum + String(f?.content ?? "").length, 0);
  if (totalLength > MAX_TOTAL_CONTENT_LENGTH) {
    return jsonError("Generated files are too large to save.", 400);
  }
  for (const f of files) {
    if (typeof f?.filename !== "string" || typeof f?.content !== "string") {
      return jsonError("Missing or invalid files.", 400);
    }
  }

  const { data, error } = await admin()
    .from("code_generations")
    .insert({ user_id: auth.userId, prompt, files })
    .select("id, prompt, files, created_at")
    .single();

  if (error) {
    console.error("code_generations POST error:", error.message);
    return jsonError("Failed to save to library.", 500);
  }

  return new Response(JSON.stringify({ item: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Missing id.", 400);

  const { error } = await admin().from("code_generations").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) {
    console.error("code_generations DELETE error:", error.message);
    return jsonError("Failed to delete.", 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
