import type { AnalyzedCycle, CycleLabel, CycleReviewStatus } from "@/types/analysis";
import type { LungSound } from "@/types/clinical";

// Shared classification palette for live data, legacy views, badges and waveform strokes.
// Saturated signal/dot colors use darker companion text for small, readable labels.
export const cycleLabels: CycleLabel[] = ["normal", "crackle", "wheeze", "both"];
export const cycleLabelStyles = {
  normal: { name: "Normal", legend: "Bình thường (Normal)", badge: "border-green-200 bg-green-50 text-green-700", solid: "#22C55E", text: "text-green-700", textColor: "#15803D", bar: "bg-[#22C55E]" },
  crackle: { name: "Crackles", legend: "Ran nổ (Crackle)", badge: "border-amber-200 bg-amber-50 text-amber-800", solid: "#F59E0B", text: "text-amber-800", textColor: "#92400E", bar: "bg-[#F59E0B]" },
  wheeze: { name: "Wheezes", legend: "Ran rít (Wheeze)", badge: "border-violet-200 bg-violet-50 text-violet-700", solid: "#8B5CF6", text: "text-violet-700", textColor: "#6D28D9", bar: "bg-[#8B5CF6]" },
  both: { name: "Crackles + Wheezes", legend: "Cả hai (Both)", badge: "border-red-200 bg-red-50 text-red-700", solid: "#EF4444", text: "text-red-700", textColor: "#B91C1C", bar: "bg-[#EF4444]" },
} satisfies Record<CycleLabel, { name: string; legend: string; badge: string; solid: string; text: string; textColor: string; bar: string }>;

export const legacyCycleLabel: Record<LungSound, CycleLabel> = {
  Normal: "normal", Crackles: "crackle", Wheezes: "wheeze", "Crackles + Wheezes": "both",
};

export const cycleReviewStyles = {
  pending: { name: "Chờ xác nhận", badge: "bg-[#FFF1F2] text-red-700" },
  confirmed: { name: "Đã xác nhận", badge: "bg-[#E7F1FB] text-[#2563A6]" },
  corrected: { name: "Đã hiệu chỉnh", badge: "bg-amber-50 text-amber-800" },
} satisfies Record<CycleReviewStatus, { name: string; badge: string }>;

export const effectiveCycleLabel = (cycle: AnalyzedCycle) => cycle.doctor_label ?? cycle.ai_label;
export const secondsText = (value: number) => `${value.toFixed(2)}s`;
