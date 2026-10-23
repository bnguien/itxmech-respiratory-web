// Ghép trạng thái hiện tại cho GET /live (hàm thuần để test).

import {
  isReadingFresh,
  pickCurrentReading,
  wearableConnection,
  type CurrentReading,
  type WearableConnection,
} from "@/lib/wearable/presentation";
import type { TelemetrySample, WearableTransport } from "@/types/wearable";

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

export interface LiveSnapshot {
  state: LiveLevel;
  reading: CurrentReading | null;
  /** false: gián đoạn / mất kết nối, số trong `reading` là số cũ, app không được hiển thị như số hiện tại. */
  fresh: boolean;
  connection: WearableConnection;
  summary: string;
}

/**
 * Số và trạng thái giống nhau cho mọi máy: số 15 giây (wearable_live) hoặc bản ghi phút, cái nào đo sau hơn;
 * kết nối suy từ lần cuối server nhận dữ liệu (cùng hàm trang bác sĩ dùng). Mất kết nối thì mức là UNKNOWN
 * và lời tóm tắt nói rõ không nhận được SpO₂, không giữ mức "Bình thường" cũ.
 */
export function buildLiveSnapshot(input: {
  live: { ts: number; spo2: number | null; spo2_min: number | null; pulse: number | null; worn: boolean } | null;
  minute: Pick<TelemetrySample, "ts" | "spo2_mean" | "spo2_min" | "pulse_mean" | "worn"> | null;
  assessmentLevel: string | null;
  device: { ts: number; transport: WearableTransport; worn: boolean } | null;
  uploadIntervalMin?: number;
  nowSeconds: number;
}): LiveSnapshot {
  const reading = pickCurrentReading(input.live, input.minute);
  const connection = wearableConnection(input.device, input.nowSeconds, input.uploadIntervalMin);
  const fresh = !!reading && isReadingFresh(connection.kind);
  const level = (input.assessmentLevel ?? "NORMAL") as LiveLevel;
  const state: LiveLevel = fresh && level in RISK ? level : "UNKNOWN";
  let summary = SUMMARY[state];
  if (!fresh && input.device) summary = `${connection.title}. ${connection.detail}`;
  else if (connection.kind === "wifi") summary = `${summary} Vòng đang tự gửi qua WiFi dự phòng nên số liệu cập nhật mỗi vài phút.`;
  else if (connection.kind === "not_worn") summary = connection.detail;
  return { state, reading, fresh, connection, summary };
}
