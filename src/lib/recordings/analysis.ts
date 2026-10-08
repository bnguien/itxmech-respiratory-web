import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { recordings } from "@/lib/db/schema/recordings";
import { respiratoryCycles } from "@/lib/db/schema/respiratory-cycles";
import { createSupabaseAdminClient, getLungRecordingsBucket } from "@/lib/supabase/admin";
import { serializeRecording, SIGNED_URL_EXPIRY_SECONDS } from "./server";
import { AnalysisError, analyzeLungSound } from "./ai-client";
import type { AiCycle } from "@/types/analysis";

const notFound = () => new AnalysisError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");

export function assertReviewsCompatible(existing: { cycleIndex: number; startSeconds: number; endSeconds: number; doctorLabel: string | null; reviewStatus: string }[], cycles: AiCycle[]) {
  for (const row of existing) {
    if (row.doctorLabel === null && row.reviewStatus === "pending") continue;
    const next = cycles.find((c) => c.index === row.cycleIndex);
    if (!next || Math.abs(next.start - row.startSeconds) > 0.000001 || Math.abs(next.end - row.endSeconds) > 0.000001) {
      throw new AnalysisError(409, "REVIEW_CONFLICT", "Kết quả mới thay đổi chu kỳ đã được bác sĩ đánh giá.");
    }
  }
}

export async function getRecordingAnalysis(recordingId: string) {
  return db.transaction(async (tx) => {
    const [row] = await tx.select().from(recordings).where(eq(recordings.id, recordingId));
    if (!row) throw notFound();
    const cycles = await tx.select().from(respiratoryCycles).where(eq(respiratoryCycles.recordingId, recordingId)).orderBy(asc(respiratoryCycles.cycleIndex));
    return {
      recording: { ...serializeRecording(row), analysis_status: row.analysisStatus, analyzed_at: row.analyzedAt, analysis_error: row.analysisError },
      cycles: cycles.map((c) => ({
        id: c.id, recording_id: c.recordingId, cycle_index: c.cycleIndex,
        start_seconds: c.startSeconds, end_seconds: c.endSeconds, duration_seconds: c.durationSeconds,
        ai_label: c.aiLabel, ai_confidence: c.aiConfidence, ai_probabilities: c.aiProbabilities,
        ai_status: c.aiStatus, ai_reason: c.aiReason, ai_n_frames: c.aiNFrames,
        doctor_label: c.doctorLabel, review_status: c.reviewStatus, created_at: c.createdAt, updated_at: c.updatedAt,
      })),
    };
  }, { isolationLevel: "repeatable read", accessMode: "read only" });
}

export async function analyzeRecording(recordingId: string) {
  // Five-minute lease allows recovery after a crashed request, without a long HTTP transaction.
  const recording = await db.transaction(async (tx) => {
    const [row] = await tx.select().from(recordings).where(eq(recordings.id, recordingId)).for("update");
    if (!row) throw notFound();
    if (row.uploadStatus !== "uploaded") throw new AnalysisError(409, "RECORDING_NOT_READY", "Bản ghi âm chưa được tải lên.");
    if (row.analysisStatus === "analyzing" && row.analysisStartedAt && Date.now() - Date.parse(row.analysisStartedAt) < 300_000) {
      throw new AnalysisError(409, "ANALYSIS_IN_PROGRESS", "Bản ghi âm đang được phân tích.");
    }
    const [claimed] = await tx.update(recordings).set({ analysisStatus: "analyzing", analysisStartedAt: new Date().toISOString(), analysisError: null, updatedAt: new Date().toISOString() }).where(eq(recordings.id, recordingId)).returning();
    return claimed;
  });
  const ownsLease = and(eq(recordings.id, recordingId), eq(recordings.analysisStartedAt, recording.analysisStartedAt!));
  try {
    const { data, error } = await createSupabaseAdminClient().storage.from(getLungRecordingsBucket()).createSignedUrl(recording.storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data) throw new AnalysisError(502, "AUDIO_UNAVAILABLE", "Không thể truy cập bản ghi âm.");
    const result = await analyzeLungSound(recordingId, data.signedUrl);
    await db.transaction(async (tx) => {
      const [current] = await tx.select().from(recordings).where(ownsLease).for("update");
      if (!current) throw new AnalysisError(409, "ANALYSIS_SUPERSEDED", "Một lần phân tích mới đã bắt đầu.");
      const existing = await tx.select().from(respiratoryCycles).where(eq(respiratoryCycles.recordingId, recordingId)).for("update");
      assertReviewsCompatible(existing, result.cycles);
      const now = new Date().toISOString();
      for (const row of existing) {
        if (!result.cycles.some((c) => c.index === row.cycleIndex)) await tx.delete(respiratoryCycles).where(eq(respiratoryCycles.id, row.id));
      }
      for (const c of result.cycles) {
        const values = { startSeconds: c.start, endSeconds: c.end, durationSeconds: c.duration, aiLabel: c.label, aiConfidence: c.confidence, aiProbabilities: c.probabilities, aiStatus: c.status, aiReason: c.reason, aiNFrames: c.n_frames, updatedAt: now };
        await tx.insert(respiratoryCycles).values({ recordingId, cycleIndex: c.index, ...values }).onConflictDoUpdate({ target: [respiratoryCycles.recordingId, respiratoryCycles.cycleIndex], set: values });
      }
      await tx.update(recordings).set({ analysisStatus: "completed", analyzedAt: now, analysisError: null, updatedAt: now }).where(ownsLease);
    });
  } catch (error) {
    const message = error instanceof AnalysisError ? error.message : "Không thể lưu kết quả phân tích. Vui lòng thử lại.";
    await db.update(recordings).set({ analysisStatus: "failed", analysisError: message, updatedAt: sql`now()` }).where(ownsLease);
    throw error;
  }
  return getRecordingAnalysis(recordingId);
}
