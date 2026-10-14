import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { recordings } from "@/lib/db/schema/recordings";
import { respiratoryCycles } from "@/lib/db/schema/respiratory-cycles";
import type { CycleReviewRequest } from "@/types/analysis";
import { AnalysisError } from "./ai-client";
import { getRecordingAnalysis } from "./analysis";

export function validateCycleReview(body: unknown): CycleReviewRequest {
  const invalid = () => { throw new AnalysisError(400, "INVALID_REVIEW", "Đánh giá chu kỳ không hợp lệ."); };
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();
  const value = body as Record<string, unknown>;
  if (typeof value.expected_updated_at !== "string" || value.expected_updated_at.length > 64 || !Number.isFinite(Date.parse(value.expected_updated_at))) return invalid();
  const allowed = value.action === "confirm" ? ["action", "expected_updated_at"] : ["action", "expected_updated_at", "doctor_label"];
  if (Object.keys(value).some((key) => !allowed.includes(key))) return invalid();
  if (value.action === "confirm") return value as CycleReviewRequest;
  if (value.action !== "correct" || !["normal", "crackle", "wheeze", "both"].includes(value.doctor_label as string)) return invalid();
  return value as CycleReviewRequest;
}

export async function reviewRecordingCycle(recordingId: string, cycleId: string, input: CycleReviewRequest) {
  await db.transaction(async (tx) => {
    // Same lock order as AI persistence. Review never races with replacing cycle results.
    const [recording] = await tx.select().from(recordings).where(eq(recordings.id, recordingId)).for("update");
    if (!recording) throw new AnalysisError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");
    if (recording.analysisStatus === "analyzing") throw new AnalysisError(409, "ANALYSIS_IN_PROGRESS", "Vui lòng chờ phân tích hoàn tất trước khi đánh giá.");
    const belongsToRecording = and(eq(respiratoryCycles.id, cycleId), eq(respiratoryCycles.recordingId, recordingId));
    const [cycle] = await tx.select().from(respiratoryCycles).where(belongsToRecording).for("update");
    if (!cycle) throw new AnalysisError(404, "NOT_FOUND", "Không tìm thấy chu kỳ hô hấp.");
    if (input.action === "confirm" && (cycle.aiStatus === "unprocessable" || !cycle.aiLabel)) {
      throw new AnalysisError(409, "NO_AI_RESULT", "Chu kỳ chưa có kết quả AI để xác nhận.");
    }
    if (input.action === "correct" && input.doctor_label === cycle.aiLabel) {
      throw new AnalysisError(400, "INVALID_REVIEW", "Chọn nhãn khác hoặc xác nhận kết quả AI.");
    }
    const [saved] = await tx.update(respiratoryCycles).set({
      // Snapshot the accepted AI label so subsequent analysis cannot change a doctor's decision.
      doctorLabel: input.action === "confirm" ? cycle.aiLabel : input.doctor_label,
      reviewStatus: input.action === "confirm" ? "confirmed" : "corrected",
      updatedAt: sql`clock_timestamp()`,
    }).where(and(belongsToRecording, eq(respiratoryCycles.updatedAt, input.expected_updated_at))).returning({ id: respiratoryCycles.id });
    if (!saved) throw new AnalysisError(409, "REVIEW_CONFLICT", "Chu kỳ đã được cập nhật. Vui lòng tải lại trước khi lưu.");
  });
  return getRecordingAnalysis(recordingId);
}
