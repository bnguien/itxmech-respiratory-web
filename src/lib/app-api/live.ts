// Ghép trạng thái hiện tại cho GET /live (hàm thuần để test).

export type LiveLevel = "UNKNOWN" | "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";

/** Bản ghi phút mới nhất cũ hơn ngưỡng này thì coi là mất dữ liệu. */
export const STALE_AFTER_MS = 15 * 60 * 1000;

const RISK: Record<LiveLevel, string> = {
  UNKNOWN: "UNKNOWN",
  NORMAL: "LOW",
  WATCH: "ELEVATED",
  ALERT: "HIGH",
  CRITICAL: "HIGH",
};

const SUMMARY: Record<LiveLevel, string> = {
  UNKNOWN: "Chưa nhận được dữ liệu từ vòng đeo gần đây.",
  NORMAL: "Chỉ số SpO₂ ổn định.",
  WATCH: "SpO₂ có xu hướng giảm, cần theo dõi thêm.",
  ALERT: "SpO₂ thấp hơn ngưỡng bác sĩ đặt.",
  CRITICAL: "SpO₂ rất thấp, cần liên hệ bác sĩ ngay.",
};

export function liveLevel(
  latestVitalTs: string | null,
  latestAssessmentLevel: string | null,
  nowMs = Date.now(),
): LiveLevel {
  if (!latestVitalTs || nowMs - new Date(latestVitalTs).getTime() > STALE_AFTER_MS) return "UNKNOWN";
  const level = (latestAssessmentLevel ?? "NORMAL") as LiveLevel;
  return level in RISK ? level : "UNKNOWN";
}

export const riskOf = (level: LiveLevel) => RISK[level];
export const summaryOf = (level: LiveLevel) => SUMMARY[level];
