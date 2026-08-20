import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

type ProGateResult =
  | { ok: true; userId: string; isAdmin: boolean }
  | { ok: false; status: number; error: string };

// Shared by every generation route (image, video, ...): resolves the caller
// from their Supabase session token and requires plan === 'pro' (or admin).
export async function requireProUser(req: NextRequest): Promise<ProGateResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!supabaseUrl || !serviceKey || !token) {
    return { ok: false, status: 401, error: "Sign in required." };
  }

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("plan, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.plan !== "pro" && !profile.is_admin)) {
    return { ok: false, status: 403, error: "This is a Pro feature. Subscribe to Yoojel Pro to unlock it." };
  }

  return { ok: true, userId: user.id, isAdmin: !!profile.is_admin };
}
