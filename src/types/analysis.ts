import type { Recording } from "./recording";

export type CycleLabel = "normal" | "crackle" | "wheeze" | "both";
export type CycleProbabilities = Record<CycleLabel, number>;
export interface AiCycle {
  index: number;
  start: number;
  end: number;
  duration: number;
  status: "processed" | "unprocessable";
  label: CycleLabel | null;
  confidence: number | null;
  probabilities: CycleProbabilities | null;
  n_frames: number | null;
  reason: string | null;
}
export interface AiAnalysis {
  recording_id: string;
  boundaries: number[];
  cycles: AiCycle[];
}

export type AnalysisStatus = "not_analyzed" | "analyzing" | "completed" | "failed";
export type CycleReviewStatus = "pending" | "confirmed" | "corrected";

export interface AnalyzedCycle {
  id: string;
  recording_id: string;
  cycle_index: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  ai_label: CycleLabel | null;
  ai_confidence: number | null;
  ai_probabilities: CycleProbabilities | null;
  ai_status: "processed" | "unprocessable";
  ai_reason: string | null;
  ai_n_frames: number | null;
  doctor_label: CycleLabel | null;
  review_status: CycleReviewStatus;
  created_at: string;
  updated_at: string;
}

export interface RecordingAnalysisData {
  recording: Recording & {
    analysis_status: AnalysisStatus;
    analyzed_at: string | null;
    analysis_error: string | null;
  };
  cycles: AnalyzedCycle[];
}

export type CycleReviewRequest = {
  expected_updated_at: string;
} & ({ action: "confirm" } | { action: "correct"; doctor_label: CycleLabel });
