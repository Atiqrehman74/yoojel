import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => ({}));
  const fullName = (body.fullName || "").trim();
  const email = (body.email || "").trim();
  if (!fullName || !email) {
    return NextResponse.json({ error: "Full name and email are required." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from("moviemaker_submissions").insert({
    project_title: body.projectTitle || null,
    genre: body.genre || null,
    estimated_runtime: body.estimatedRuntime || null,
    country: body.country || null,
    production_stage: body.productionStage || null,
    has_screenplay: typeof body.hasScreenplay === "boolean" ? body.hasScreenplay : null,
    has_concept_art: typeof body.hasConceptArt === "boolean" ? body.hasConceptArt : null,
    full_name: fullName,
    company: body.company || null,
    role: body.role || null,
    email,
    phone: body.phone || null,
    portfolio_url: body.portfolioUrl || null,
    description: body.description || null,
  });

  if (error) {
    console.error("moviemaker_submissions insert failed:", error);
    return NextResponse.json({ error: "Could not submit right now. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
