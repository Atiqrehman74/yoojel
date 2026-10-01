import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { checkSchema } from "@/lib/schemaCheck";

// Reports columns the code expects but the database does not have. Exists
// because a migration that is written and committed but never run against
// the database fails silently, and has done so three times -- see
// lib/schemaCheck.ts for the specific cases and what each one broke.

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }
  if (!auth.isAdmin) {
    return Response.json({ error: "Admins only." }, { status: 403 });
  }

  const report = await checkSchema();
  return Response.json(report, { status: report.ok ? 200 : 409 });
}
