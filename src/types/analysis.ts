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
