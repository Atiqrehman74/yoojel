import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { sendAppilixPush } from "@/lib/appilixPush";

// Admin-only endpoint for sending a push notification to the mobile app.
// Broadcasts when no userIdentity is given, so it is deliberately gated on
// is_admin rather than merely on a Pro plan.

export const runtime = "nodejs";
export const maxDuration = 30;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }
  if (!auth.isAdmin) {
    return jsonError("Admins only.", 403);
  }

  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return jsonError("Missing notification.", 400);
  }

  const { title, body, userIdentity, openLinkUrl, imageUrl } = payload as Record<string, unknown>;
  if (typeof title !== "string" || typeof body !== "string") {
    return jsonError("A notification needs both a title and a body.", 400);
  }

  const result = await sendAppilixPush({
    title,
    body,
    userIdentity: Array.isArray(userIdentity)
      ? userIdentity.filter((id): id is string => typeof id === "string")
      : typeof userIdentity === "string"
      ? userIdentity
      : undefined,
    openLinkUrl: typeof openLinkUrl === "string" ? openLinkUrl : undefined,
    imageUrl: typeof imageUrl === "string" ? imageUrl : undefined,
  });

  if (!result.ok) {
    return jsonError(result.error, 502);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
