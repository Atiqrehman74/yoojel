import { createClient } from "@supabase/supabase-js";

// Three migrations in supabase/sql/ have now been written, committed, and
// never actually run against the database -- and every time the symptom was
// silent and got blamed on something else:
//
//   profiles.voice_count            -> voice generations quietly spent the
//                                      user's *video* quota, because the
//                                      older function's else-branch caught
//                                      'voice' and incremented video_count
//   pending_generations.prompt      -> the webhook's claim failed outright,
//                                      reporting "already resolved" while
//                                      the row sat at 'pending'
//
// This module turns that class of bug from invisible into obvious. It asks
// PostgREST for each expected column and reports the ones the database does
// not have. A missing column makes PostgREST reject the request, which is
// exactly the signal we want -- cheap, and it needs no database privileges
// beyond the ones the app already uses.

export type ColumnCheck = {
  table: string;
  column: string;
  present: boolean;
  /** Set when the whole table is missing rather than a single column. */
  tableMissing?: boolean;
};

export type SchemaReport = {
  ok: boolean;
  checked: number;
  missing: ColumnCheck[];
  /** Plain-English consequence for each known-missing column. */
  notes: string[];
  error?: string;
};

// What the code in this repo assumes exists. Derived from supabase/sql/.
// Keep this in step when a migration adds a column the app reads or writes.
const EXPECTED: Record<string, string[]> = {
  profiles: [
    "id",
    "email",
    "full_name",
    "plan",
    "stripe_customer_id",
    "stripe_subscription_id",
    "message_count",
    "is_admin",
    "created_at",
    "usage_period",
    "image_count",
    "video_count",
    "voice_count",
  ],
  generations: ["id", "user_id", "kind", "prompt", "url", "created_at"],
  pending_generations: [
    "id",
    "user_id",
    "user_email",
    "kind",
    "request_id",
    "status",
    "created_at",
    "resolved_at",
    "prompt",
  ],
  code_generations: ["id", "user_id", "prompt", "files", "created_at"],
  research_generations: [
    "id",
    "user_id",
    "topic",
    "depth",
    "report",
    "sources",
    "created_at",
  ],
  projects: ["id", "user_id", "name", "description", "created_at", "updated_at"],
  cloned_voices: ["id", "user_id", "voice_id", "name", "preview_url", "created_at"],
  corporate_leads: ["id", "created_at", "full_name", "business_email"],
  moviemaker_submissions: ["id", "created_at"],
};

// Why a given gap matters, in terms of user-visible behaviour rather than
// schema. Only for columns whose absence fails quietly.
const CONSEQUENCES: Record<string, string> = {
  "profiles.voice_count":
    "Voice generations spend the user's VIDEO quota instead of their own. " +
    "Run supabase/sql/2026-08-21-voice-usage-limit.sql.",
  "pending_generations.prompt":
    "Library entries saved by the completion webhook are labelled with a " +
    "placeholder instead of the user's prompt. " +
    "Run supabase/sql/2026-09-26-pending-generations-prompt.sql.",
};

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function checkSchema(): Promise<SchemaReport> {
  const db = admin();
  if (!db) {
    return {
      ok: false,
      checked: 0,
      missing: [],
      notes: [],
      error: "Supabase is not configured.",
    };
  }

  const missing: ColumnCheck[] = [];
  let checked = 0;

  for (const [table, columns] of Object.entries(EXPECTED)) {
    // One probe for the table itself, so a missing table is reported once
    // rather than as every one of its columns.
    const tableProbe = await db.from(table).select("*").limit(0);
    if (tableProbe.error) {
      missing.push({ table, column: "*", present: false, tableMissing: true });
      checked += 1;
      continue;
    }

    for (const column of columns) {
      checked += 1;
      const { error } = await db.from(table).select(column).limit(0);
      if (error) {
        missing.push({ table, column, present: false });
      }
    }
  }

  const notes = missing
    .map((m) => CONSEQUENCES[`${m.table}.${m.column}`])
    .filter((n): n is string => !!n);

  return { ok: missing.length === 0, checked, missing, notes };
}

/** Logs loudly when the live schema is behind the code. Safe to call from a
 *  route: it swallows its own failures rather than breaking a request. */
export async function warnOnSchemaDrift(): Promise<void> {
  try {
    const report = await checkSchema();
    if (report.ok) return;
    for (const m of report.missing) {
      console.error(
        `[schema] missing ${m.tableMissing ? "table" : "column"} ${m.table}.${m.column}`
      );
    }
    for (const note of report.notes) {
      console.error(`[schema] consequence: ${note}`);
    }
  } catch {
    // Never let a diagnostic break the thing it is diagnosing.
  }
}
