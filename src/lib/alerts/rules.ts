// Quy tắc gộp cảnh báo từ assessment của vòng (hàm thuần, test không cần DB).
import { assessmentTriggerLabels, formatSpo2 } from "@/lib/wearable/presentation";
import type { AssessmentTrigger } from "@/types/wearable";

export type AlertLevel = "ALERT" | "CRITICAL";

/** Hai assessment cách nhau dưới khoảng này coi là cùng một đợt (vòng gửi assessment ít nhất mỗi 5 phút). */
export const EPISODE_GAP_MS = 30 * 60 * 1000;

export const isAlertLevel = (level: string): level is AlertLevel => level === "ALERT" || level === "CRITICAL";

export interface EpisodeRef {
  level: AlertLevel;
  acknowledgedAt: string | null;
  lastSeenAt: string;
}

/**
 * Assessment mức ALERT / CRITICAL mới đến:
 * - không có đợt nào trong 30 phút → `open` (cảnh báo mới, gửi thông báo);
 * - đợt đang có ở mức ALERT mà giờ là CRITICAL → `escalate` (nâng mức, mở lại nếu bác sĩ đã xem, gửi thông báo);
 * - còn lại → `extend` (chỉ dời last_seen_at, không báo lại).
 */
export function planAlert(episode: EpisodeRef | null, level: AlertLevel, tsMs: number): "open" | "escalate" | "extend" {
  if (!episode || tsMs - new Date(episode.lastSeenAt).getTime() > EPISODE_GAP_MS) return "open";
  if (level === "CRITICAL" && episode.level === "ALERT") return "escalate";
  return "extend";
}

/** Trạng thái theo hợp đồng app: OPEN | ACKNOWLEDGED | RESOLVED (hết đợt 30 phút mà chưa ai xem thì là RESOLVED). */
export function alertStatus(
  alert: { acknowledgedAt: string | null; familyAckedAt?: string | null; lastSeenAt: string },
  nowMs = Date.now(),
) {
  if (alert.acknowledgedAt || alert.familyAckedAt) return "ACKNOWLEDGED" as const;
  return nowMs - new Date(alert.lastSeenAt).getTime() > EPISODE_GAP_MS ? ("RESOLVED" as const) : ("OPEN" as const);
}

export function alertSummary(level: string, trigger: string, spo2: number | null, pulse: number | null) {
  const head = level === "CRITICAL" ? "Nguy hiểm" : "Cảnh báo";
  const reason = assessmentTriggerLabels[trigger as AssessmentTrigger] ?? "Vòng báo bất thường";
  const values = [spo2 !== null ? `SpO₂ ${formatSpo2(spo2)}` : null, pulse !== null ? `mạch ${Math.round(pulse)}` : null].filter(Boolean);
  return `${head}: ${reason}${values.length ? ` (${values.join(", ")})` : ""}`;
}
