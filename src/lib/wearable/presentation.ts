import type {
  AssessmentTrigger,
  TelemetrySample,
  WearableLevel,
  WearableTransport,
} from "@/types/wearable";

// Hằng số cố định theo lúc huấn luyện model hybrid_tc (firmware/include/spo2_tc_params.h).
// Web chỉ hiển thị, không cho bác sĩ sửa các giá trị này.
export const MODEL_WINDOW_MIN = 60;
export const MODEL_EVAL_EVERY_MIN = 5;
export const RULE_EVENT_MIN = 3;
export const SPO2_T_MIN = 85;
export const SPO2_T_MAX = 95;
export const DEFAULT_SPO2_T = 88;

// Bảng ngưỡng INT8 theo T (index = T - 85) và hệ số đổi out_q -> xác suất.
const WATCH_THR_Q = [54, 54, 63, 71, 79, 87, 94, 101, 106, 110, 110];
const ALERT_THR_Q = [71, 71, 79, 86, 93, 101, 105, 109, 114, 117, 117];
const OUT_ZP = 125;
const OUT_SCALE = 0.0433892645;

export function probFromQ(q: number) {
  return 1 / (1 + Math.exp(-(q - OUT_ZP) * OUT_SCALE));
}

/** Ngưỡng xác suất Watch/Alert mà vòng đang dùng cho ngưỡng T. */
export function riskThresholds(T: number) {
  const index = Math.min(Math.max(Math.round(T), SPO2_T_MIN), SPO2_T_MAX) - SPO2_T_MIN;
  return { watch: probFromQ(WATCH_THR_Q[index]), alert: probFromQ(ALERT_THR_Q[index]) };
}

export const wearableLevelStyles = {
  UNKNOWN: { name: "Chưa đủ dữ liệu", badge: "border-[#E1ECF7] bg-[#F4F8FD] text-[#5A7799]", solid: "#9EB4CC", text: "text-[#5A7799]" },
  NORMAL: { name: "Bình thường", badge: "border-green-200 bg-green-50 text-green-700", solid: "#22C55E", text: "text-green-700" },
  WATCH: { name: "Theo dõi", badge: "border-amber-200 bg-amber-50 text-amber-800", solid: "#F59E0B", text: "text-amber-800" },
  ALERT: { name: "Cảnh báo", badge: "border-orange-200 bg-orange-50 text-orange-700", solid: "#F97316", text: "text-orange-700" },
  CRITICAL: { name: "Nguy hiểm", badge: "border-red-200 bg-red-50 text-red-700", solid: "#EF4444", text: "text-red-700" },
} satisfies Record<WearableLevel, { name: string; badge: string; solid: string; text: string }>;

export const assessmentTriggerLabels: Record<AssessmentTrigger, string> = {
  ml_risk: "AI dự báo nguy cơ tụt SpO₂",
  rule_alert: `SpO₂ dưới ngưỡng T liên tục ≥ ${RULE_EVENT_MIN} phút`,
  rule_critical: "SpO₂ dưới ngưỡng nguy hiểm",
  hr_out_of_range: "Nhịp mạch ngoài khoảng cho phép",
  signal_lost: "Mất tín hiệu hoặc chưa đeo vòng",
  none: "Không có dấu hiệu bất thường",
};

export const transportLabels: Record<WearableTransport, string> = {
  ble_relay: "BLE qua điện thoại",
  wifi: "WiFi dự phòng",
};

// Hiển thị theo giờ Việt Nam cố định để server và trình duyệt render giống nhau.
const VN_OFFSET_SECONDS = 7 * 3600;

export function formatClock(ts: number) {
  const date = new Date((ts + VN_OFFSET_SECONDS) * 1000);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

export function formatProb(prob: number | null) {
  return prob === null ? "—" : `${Math.round(prob * 100)}%`;
}

export function formatSpo2(value: number | null) {
  return value === null ? "—" : `${Math.round(value)}%`;
}

/** Tóm tắt các phút có SpO₂ hợp lệ; bỏ qua null (mất tín hiệu, không đeo). */
export function summarizeSamples(samples: TelemetrySample[]) {
  const values = samples.flatMap((sample) => (sample.spo2_mean === null ? [] : [sample.spo2_mean]));
  const lows = samples.flatMap((sample) => (sample.spo2_min === null ? [] : [sample.spo2_min]));
  const latest = samples.findLast((sample) => sample.spo2_mean !== null);
  if (values.length === 0) return null;
  return {
    current: latest?.spo2_mean ?? null,
    average: values.reduce((total, value) => total + value, 0) / values.length,
    highest: Math.max(...values),
    lowest: Math.min(...lows),
    validMinutes: values.length,
  };
}

/** Số phút còn thiếu trước khi model đủ cửa sổ 60 phút để chạy. */
export function minutesUntilModelReady(samples: TelemetrySample[]) {
  return Math.max(0, MODEL_WINDOW_MIN - samples.length);
}
