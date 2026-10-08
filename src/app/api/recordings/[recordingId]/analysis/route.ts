import type { NextRequest } from "next/server";
import { getRecordingAnalysis } from "@/lib/recordings/analysis";
import { handleAnalysis } from "@/lib/recordings/analysis-route";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ recordingId: string }> }) {
  return handleAnalysis(params, getRecordingAnalysis);
}
