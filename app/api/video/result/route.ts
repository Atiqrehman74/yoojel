import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiPoll, muapiOutputUrl } from "@/lib/muapi";

export const runtime = "nodejs";
export const maxDuration = 15;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function GET(req: NextRequest) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return jsonError(auth.error, auth.status);
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return jsonError("Video generation isn't configured yet — contact support.", 500);
  }

  const requestId = req.nextUrl.searchParams.get("id");
  if (!requestId) {
    return jsonError("Missing id.", 400);
  }

  try {
    const result = await muapiPoll(requestId, key);
    const status = result.status?.toLowerCase();
    if (status === "completed" || status === "succeeded" || status === "success") {
      return new Response(JSON.stringify({ status: "done", url: muapiOutputUrl(result) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (status === "failed" || status === "error") {
      return new Response(JSON.stringify({ status: "failed", error: result.error || "Video generation failed." }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ status: "pending" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return jsonError(err?.message || "Poll failed.", 502);
  }
}
