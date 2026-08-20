import { createClient } from "@supabase/supabase-js";

export const IMAGE_MONTHLY_LIMIT = 20;
export const VIDEO_MONTHLY_LIMIT = 5;

// Calls the increment_generation_usage() Postgres function (see
// supabase/sql/2026-08-21-generation-usage-limits.sql), which atomically
// checks the caller's usage against the monthly limit -- resetting the
// count if the calendar month has rolled over -- and increments on success.
// Returns { ok: true, count } or { ok: false } if the limit was reached.
export async function checkAndIncrementUsage(
  userId: string,
  kind: "image" | "video",
  limit: number
): Promise<{ ok: true; count: number } | { ok: false }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await admin.rpc("increment_generation_usage", {
    p_user_id: userId,
    p_kind: kind,
    p_limit: limit,
  });

  if (error || typeof data !== "number" || data < 0) {
    return { ok: false };
  }
  return { ok: true, count: data };
}
