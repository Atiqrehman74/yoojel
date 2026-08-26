import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/requireProUser";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;

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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { data, error } = await admin()
    .from("projects")
    .select("id, name, description, created_at, updated_at")
    .eq("id", params.id)
    .eq("user_id", auth.userId)
    .single();

  if (error || !data) {
    return jsonError("Project not found.", 404);
  }

  return new Response(JSON.stringify({ item: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { name, description } = await req.json().catch(() => ({}));
  if (typeof name !== "string" || !name.trim()) {
    return jsonError("Missing project name.", 400);
  }
  if (name.length > MAX_NAME_LENGTH) {
    return jsonError(`Name is too long (max ${MAX_NAME_LENGTH} characters).`, 400);
  }
  if (typeof description === "string" && description.length > MAX_DESCRIPTION_LENGTH) {
    return jsonError(`Description is too long (max ${MAX_DESCRIPTION_LENGTH} characters).`, 400);
  }

  const { data, error } = await admin()
    .from("projects")
    .update({
      name: name.trim(),
      description: typeof description === "string" ? description.trim() : "",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", auth.userId)
    .select("id, name, description, created_at, updated_at")
    .single();

  if (error || !data) {
    console.error("projects PATCH error:", error?.message);
    return jsonError("Failed to update project.", 500);
  }

  return new Response(JSON.stringify({ item: data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireUser(req);
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { error } = await admin().from("projects").delete().eq("id", params.id).eq("user_id", auth.userId);
  if (error) {
    console.error("projects DELETE error:", error.message);
    return jsonError("Failed to delete project.", 500);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
