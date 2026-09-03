import { NextRequest } from "next/server";
import { requireProUser } from "@/lib/requireProUser";
import { muapiPoll, muapiOutputUrl, toDownloadUrl } from "@/lib/muapi";

// Shared poll handler for /api/image/result and /api/video/result -- both
// generation kinds submit a Muapi job and poll it identically.
export async function handleGenerationResult(req: NextRequest, notConfiguredMessage: string) {
  const auth = await requireProUser(req);
  if (!auth.ok) {
    return Response.json({ error: auth.error }, { status: auth.status });
  }

  const key = process.env.MUAPI_KEY;
  if (!key) {
    return Response.json({ error: notConfiguredMessage }, { status: 500 });
  }

  const requestId = req.nextUrl.searchParams.get("id");
  if (!requestId) {
    return Response.json({ error: "Missing id." }, { status: 400 });
  }

  try {
    const result = await muapiPoll(requestId, key);
    const status = result.status?.toLowerCase();
    if (status === "completed" || status === "succeeded" || status === "success") {
      return Response.json({ status: "done", url: toDownloadUrl(muapiOutputUrl(result)) });
    }
    if (status === "failed" || status === "error") {
      return Response.json({ status: "failed", error: result.error || "Generation failed." });
    }
    return Response.json({ status: "pending" });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Poll failed." }, { status: 502 });
  }
}
