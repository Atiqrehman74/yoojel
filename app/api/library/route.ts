import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireProUser } from "@/lib/requireProUser";

// Backs the "Library" feature: persists generated images/videos per-user
// (see supabase/sql/2026-08-26-library-generations.sql) so they survive a
// page reload instead of only living in Image/Video Studio's session state.

export const runtime = "nodejs";

const KINDS = new Set(["image", "video"]);
const LIST_LIMIT = 60;

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

  const kind = req.nextUrl.searchParams.get("kind");
  let query = admin()
    .from("generations")
    .select("id, kind, prompt, url, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (kind && KINDS.has(kind)) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;
  if (error) {
    console.error("library GET error:", error.message);
    return jsonError("Failed to load library.", 500);
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { kind, prompt, url } = await req.json().catch(() => ({}));
  if (!KINDS.has(kind) || typeof prompt !== "string" || typeof url !== "string" || !url) {
    return jsonError("Missing or invalid kind/prompt/url.", 400);
  }

  const { data, error } = await admin()
    .from("generations")
    .insert({ user_id: auth.userId, kind, prompt, url })
    .select("id, kind, prompt, url, created_at")
    .single();

  if (error) {
    console.error("library POST error:", error.message);
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

  const { error } = await admin().from("generations").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) {
    console.error("library DELETE error:", error.message);
    return jsonError("Failed to delete.", 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
