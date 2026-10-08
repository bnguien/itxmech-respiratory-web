import "server-only";
import type { AiAnalysis } from "@/types/analysis";

export class AnalysisError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

const labels = ["normal", "crackle", "wheeze", "both"];
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const probability = (v: unknown) => finite(v) && v >= 0 && v <= 1;
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

export function validateAiAnalysis(value: unknown, recordingId: string): AiAnalysis {
  const invalid = () => { throw new AnalysisError(502, "AI_INVALID_RESPONSE", "Dữ liệu phân tích không hợp lệ."); };
  if (!object(value) || value.recording_id !== recordingId || !Array.isArray(value.boundaries) || !Array.isArray(value.cycles)) return invalid();
  if (!value.boundaries.every((v, i, a) => finite(v) && v >= 0 && (i === 0 || v > a[i - 1]))) return invalid();
  const indices = new Set<number>();
  let previousEnd = 0;
  for (const c of value.cycles) {
    if (!object(c) || !Number.isInteger(c.index) || (c.index as number) < 0 || indices.has(c.index as number)
      || !finite(c.start) || c.start < previousEnd || !finite(c.end) || c.end <= c.start
      || !finite(c.duration) || c.duration <= 0 || Math.abs(c.end - c.start - c.duration) > 0.01
      || !["processed", "unprocessable"].includes(c.status as string)
      || !(c.label === null || labels.includes(c.label as string))
      || !(c.confidence === null || probability(c.confidence))
      || !(c.reason === null || typeof c.reason === "string")
      || !(c.n_frames === null || (Number.isInteger(c.n_frames) && (c.n_frames as number) >= 0))) return invalid();
    if (c.probabilities !== null) {
      if (!object(c.probabilities) || Object.keys(c.probabilities).length !== labels.length || !labels.every((label) => probability((c.probabilities as Record<string, unknown>)[label]))) return invalid();
      if (Math.abs(Object.values(c.probabilities).reduce<number>((sum, p) => sum + (p as number), 0) - 1) > 0.02) return invalid();
    }
    if (c.status === "processed" && (c.label === null || c.confidence === null || c.probabilities === null || c.n_frames === null)) return invalid();
    indices.add(c.index as number);
    previousEnd = c.end;
  }
  return value as unknown as AiAnalysis;
}

export async function analyzeLungSound(recordingId: string, audioUrl: string): Promise<AiAnalysis> {
  const base = process.env.AI_SERVER_URL;
  if (!base) throw new AnalysisError(503, "AI_NOT_CONFIGURED", "Dịch vụ phân tích chưa được cấu hình.");
  try {
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/lung-sound/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recording_id: recordingId, audio_url: audioUrl }),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) throw new AnalysisError(502, "AI_UNAVAILABLE", "Dịch vụ phân tích không khả dụng. Vui lòng thử lại.");
    let body: unknown;
    try { body = await response.json(); } catch { throw new AnalysisError(502, "AI_INVALID_RESPONSE", "Dữ liệu phân tích không hợp lệ."); }
    return validateAiAnalysis(body, recordingId);
  } catch (error) {
    if (error instanceof AnalysisError) throw error;
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) {
      throw new AnalysisError(504, "AI_TIMEOUT", "Phân tích quá thời gian chờ. Vui lòng thử lại.");
    }
    throw new AnalysisError(502, "AI_UNAVAILABLE", "Không thể kết nối dịch vụ phân tích.");
  }
}
