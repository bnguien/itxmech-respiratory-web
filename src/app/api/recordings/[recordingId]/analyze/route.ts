import type { NextRequest } from "next/server";
import { analyzeRecording } from "@/lib/recordings/analysis";
import { handleAnalysis } from "@/lib/recordings/analysis-route";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ recordingId: string }> },
) {
  return handleAnalysis(params, analyzeRecording);
}
