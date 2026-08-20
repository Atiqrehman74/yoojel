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
  const businessEmail = (body.businessEmail || "").trim();
  if (!fullName || !businessEmail) {
    return NextResponse.json({ error: "Full name and business email are required." }, { status: 400 });
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { error } = await admin.from("corporate_leads").insert({
    company_name: body.companyName || null,
    industry: body.industry || null,
    country: body.country || null,
    company_website: body.companyWebsite || null,
    employee_count: body.employeeCount || null,
    revenue_range: body.revenueRange || null,
    full_name: fullName,
    job_title: body.jobTitle || null,
    business_email: businessEmail,
    phone: body.phone || null,
    preferred_contact: body.preferredContact || null,
    interests: Array.isArray(body.interests) ? body.interests : [],
    requirements: body.requirements || null,
  });

  if (error) {
    console.error("corporate_leads insert failed:", error);
    return NextResponse.json({ error: "Could not submit right now. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
