import type { CycleReviewRequest, RecordingAnalysisData } from "@/types/analysis";

export class RecordingAnalysisRequestError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

async function request(url: string, init?: RequestInit): Promise<RecordingAnalysisData> {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json();
  if (!response.ok || !body.data) {
    throw new RecordingAnalysisRequestError(body.error?.code ?? "REQUEST_FAILED", body.error?.message ?? "Không thể tải kết quả phân tích.");
  }
  return body.data;
}

export const recordingAnalysisService = {
  get: (id: string, signal?: AbortSignal) => request(`/api/recordings/${id}/analysis`, { signal }),
  analyze: (id: string) => request(`/api/recordings/${id}/analyze`, { method: "POST" }),
  review: (id: string, cycleId: string, review: CycleReviewRequest) => request(`/api/recordings/${id}/cycles/${cycleId}/review`, {
    method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(review),
  }),
};
