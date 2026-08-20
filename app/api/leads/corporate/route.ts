import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendNotificationEmail, renderLeadEmailHtml } from "@/lib/email";

export const runtime = "nodejs";

const NOTIFY_EMAIL = "mus.iobm@gmail.com";

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
  const interests = Array.isArray(body.interests) ? body.interests : [];
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
    interests,
    requirements: body.requirements || null,
  });

  if (error) {
    console.error("corporate_leads insert failed:", error);
    return NextResponse.json({ error: "Could not submit right now. Please try again." }, { status: 500 });
  }

  // Best-effort notification -- the lead is already saved, so an email
  // hiccup shouldn't turn into a failed submission for the user. Awaited
  // (not fire-and-forget) since a serverless function can be frozen the
  // instant the response is sent, killing any un-awaited work in flight.
  let emailResult: { ok: boolean; error?: string } = { ok: false, error: "not attempted" };
  try {
    emailResult = await sendNotificationEmail({
      to: NOTIFY_EMAIL,
      subject: `New Yoojel Corporate lead: ${body.companyName || fullName}`,
      html: renderLeadEmailHtml("New Yoojel Corporate early-access request", [
        ["Company Name", body.companyName],
        ["Industry / Sector", body.industry],
        ["Country", body.country],
        ["Company Website", body.companyWebsite],
        ["Number of Employees", body.employeeCount],
        ["Annual Revenue Range", body.revenueRange],
        ["Full Name", fullName],
        ["Job Title / Position", body.jobTitle],
        ["Business Email", businessEmail],
        ["Phone / WhatsApp", body.phone],
        ["Preferred Contact Method", body.preferredContact],
        ["Interested In", interests.join(", ")],
        ["Requirements", body.requirements],
      ]),
    });
  } catch (e) {
    emailResult = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  // TEMP DEBUG: surfacing emailDebug in the response to diagnose why
  // production isn't sending while local dev does. Remove once confirmed.
  return NextResponse.json({ ok: true, emailDebug: emailResult });
}
