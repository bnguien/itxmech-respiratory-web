import type { NextRequest } from "next/server";
import { handleAnalysis } from "@/lib/recordings/analysis-route";
import { AnalysisError } from "@/lib/recordings/ai-client";
import { reviewRecordingCycle, validateCycleReview } from "@/lib/recordings/review";
import { uuidPattern } from "@/lib/visits/validation";

export const runtime = "nodejs";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ recordingId: string; cycleId: string }> }) {
  return handleAnalysis(params, async (recordingId) => {
    const { cycleId } = await params;
    if (!uuidPattern.test(cycleId)) throw new AnalysisError(404, "NOT_FOUND", "Không tìm thấy chu kỳ hô hấp.");
    let body: unknown;
    try { body = await request.json(); } catch { throw new AnalysisError(400, "INVALID_REVIEW", "Đánh giá chu kỳ không hợp lệ."); }
    return reviewRecordingCycle(recordingId, cycleId, validateCycleReview(body));
  });
}
