import { NextRequest } from "next/server";
import { handleGenerationResult } from "@/lib/generationResult";

export const runtime = "nodejs";
export const maxDuration = 15;

export async function GET(req: NextRequest) {
  return handleGenerationResult(req, "Image generation isn't configured yet — contact support.");
}
