import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/requireProUser";

// Backs Deep Research's history panel and the Library page's "Research"
// tab. Uses requireUser (not requireProUser) -- Deep Research itself isn't
// Pro-gated, so saving/listing/deleting your own reports shouldn't require
// a plan the tool doesn't ask for either. Only sign-in is required.

export const runtime = "nodejs";

const LIST_LIMIT = 60;
const MAX_REPORT_LENGTH = 100000;

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
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await admin()
    .from("research_generations")
    .select("id, topic, depth, report, sources, created_at")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (error) {
    console.error("research_generations GET error:", error.message);
    return jsonError("Failed to load research library.", 500);
  }

  return new Response(JSON.stringify({ items: data ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { topic, depth, report, sources } = await req.json().catch(() => ({}));
  if (typeof topic !== "string" || !topic) {
    return jsonError("Missing topic.", 400);
  }
  if (typeof report !== "string" || !report) {
    return jsonError("Missing report.", 400);
  }
  if (report.length > MAX_REPORT_LENGTH) {
    return jsonError("Report is too long to save.", 400);
  }

  const { data, error } = await admin()
    .from("research_generations")
    .insert({
      user_id: auth.userId,
      topic,
      depth: typeof depth === "string" ? depth : "standard",
      report,
      sources: Array.isArray(sources) ? sources : [],
    })
    .select("id, topic, depth, report, sources, created_at")
    .single();

  if (error) {
    console.error("research_generations POST error:", error.message);
    return jsonError("Failed to save to library.", 500);
  }

  return new Response(JSON.stringify({ item: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return jsonError("Missing id.", 400);

  const { error } = await admin().from("research_generations").delete().eq("id", id).eq("user_id", auth.userId);
  if (error) {
    console.error("research_generations DELETE error:", error.message);
    return jsonError("Failed to delete.", 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
