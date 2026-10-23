import type {
  AssessmentTrigger,
  DeviceDiagnostic,
  TelemetrySample,
  WearableLevel,
  WearableStatus,
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

/** Giờ đo có giây ("10:32:15"), để người nhà đối chiếu cùng một số giữa các máy. */
export function formatClockSeconds(ts: number) {
  const date = new Date((ts + VN_OFFSET_SECONDS) * 1000);
  return `${formatClock(ts)}:${String(date.getUTCSeconds()).padStart(2, "0")}`;
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

/**
 * Qua app (BLE): vòng gửi số hiển thị mỗi 15 giây, app chuyển lên ngay (bản ghi phút mỗi 30 giây).
 * Quá 90 giây không có gì mới là gián đoạn: báo sớm để người nhà không nhìn một số đã cũ.
 */
export const BLE_STALE_SECONDS = 90;
/** Chu kỳ số hiển thị của vòng (LIVE v2). */
export const LIVE_PERIOD_SECONDS = 15;

/** Số đang hiển thị: số 15 giây (LIVE) hoặc bản ghi phút, cái nào đo sau hơn. Giống nhau ở app, máy người nhà, web. */
export interface CurrentReading {
  source: "live" | "minute";
  /** epoch giây: cuối cửa sổ đo ("đo lúc") */
  ts: number;
  spo2: number | null;
  spo2_min: number | null;
  pulse: number | null;
  worn: boolean;
}

export function pickCurrentReading(
  live: { ts: number; spo2: number | null; spo2_min: number | null; pulse: number | null; worn: boolean } | null,
  minute: Pick<TelemetrySample, "ts" | "spo2_mean" | "spo2_min" | "pulse_mean" | "worn"> | null,
): CurrentReading | null {
  // Bản ghi phút mang ts đầu phút: so bằng cuối phút.
  const minuteEnd = minute ? minute.ts + 60 : -Infinity;
  if (live && live.ts >= minuteEnd) return { source: "live", ...live };
  if (!minute) return null;
  return {
    source: "minute",
    ts: minuteEnd,
    spo2: minute.spo2_mean,
    spo2_min: minute.spo2_min,
    pulse: minute.pulse_mean,
    worn: minute.worn,
  };
}

/** Ngưỡng CPU (giây bận nhất) coi là quá tải, theo tiêu chí nhóm đặt: bình thường 30–40%, đỉnh ~70% là tốt. */
export const CPU_OVERLOAD_PCT = 85;

/** Tóm tắt DIAG nhiều cửa sổ: trung bình CPU, đỉnh lớn nhất, model lâu nhất, số lần khởi động lại. */
export function summarizeDiagnostics(items: DeviceDiagnostic[]) {
  const values = (pick: (d: DeviceDiagnostic) => number | null) =>
    items.flatMap((d) => {
      const v = pick(d);
      return v === null ? [] : [v];
    });
  const avg = values((d) => d.cpu_avg_pct);
  const peaks = values((d) => d.cpu_peak_pct);
  const models = values((d) => d.model_ms);
  const cpuPeak = peaks.length ? Math.max(...peaks) : null;
  return {
    cpuAvg: avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null,
    cpuPeak,
    modelMax: models.length ? Math.max(...models) : null,
    resets: new Set(items.map((d) => d.boot_id)).size - (items.length ? 1 : 0),
    overloaded: cpuPeak !== null && cpuPeak > CPU_OVERLOAD_PCT,
  };
}

/** Còn được coi là "số hiện tại" (đang nhận dữ liệu hoặc WiFi dự phòng đúng nhịp). Gián đoạn / mất kết nối thì không. */
export const isReadingFresh = (kind: WearableConnectionKind) => kind === "live" || kind === "not_worn" || kind === "wifi";
/** Chu kỳ WiFi mặc định của vòng khi mất app (config.uplink.upload_interval_min). */
export const DEFAULT_UPLOAD_INTERVAL_MIN = 10;

export type WearableConnectionKind = "none" | "waiting_first" | "live" | "not_worn" | "wifi" | "interrupted" | "lost";

export interface WearableConnection {
  kind: WearableConnectionKind;
  tone: "ok" | "info" | "warn" | "bad" | "muted";
  title: string;
  detail: string;
}

export function formatAgo(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} giờ`;
  return `${Math.round(hours / 24)} ngày`;
}

const VN_DAY = (ts: number) => {
  const date = new Date((ts + VN_OFFSET_SECONDS) * 1000);
  return `${String(date.getUTCDate()).padStart(2, "0")}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

/**
 * Trạng thái kết nối của vòng cho bác sĩ, suy từ lần cuối server nhận dữ liệu và đường truyền:
 * BLE qua app (gửi mỗi 30 s) → nếu mất app, vòng chờ 60 s rồi tự gửi qua WiFi mỗi `uploadIntervalMin` phút.
 */
export function wearableConnection(
  device: Pick<WearableStatus, "ts" | "transport" | "worn"> | null,
  nowSeconds: number,
  uploadIntervalMin = DEFAULT_UPLOAD_INTERVAL_MIN,
): WearableConnection {
  if (!device) {
    return {
      kind: "none",
      tone: "muted",
      title: "Chưa kết nối vòng đeo",
      detail: "Chưa có vòng nào gửi dữ liệu cho bệnh nhân này. Người nhà đăng nhập app và kết nối vòng để bắt đầu nhận SpO₂.",
    };
  }
  if (!device.ts) {
    return {
      kind: "waiting_first",
      tone: "muted",
      title: "Đang chờ dữ liệu đầu tiên",
      detail: "Vòng đã được gán nhưng server chưa nhận bản ghi nào.",
    };
  }
  const age = Math.max(0, nowSeconds - device.ts);
  const last = `lần cuối ${formatClock(device.ts)} ${VN_DAY(device.ts)}`;
  const wifiWindow = (uploadIntervalMin + 5) * 60;

  if (device.transport === "wifi" && age <= wifiWindow) {
    return {
      kind: "wifi",
      tone: "info",
      title: "Đang dùng WiFi dự phòng",
      detail: `Vòng không còn kết nối BLE với điện thoại và đang tự gửi qua WiFi mỗi ${uploadIntervalMin} phút; cảnh báo được gửi ngay. Số liệu cập nhật chậm hơn bình thường (${last}).`,
    };
  }
  if (device.transport !== "wifi" && age <= BLE_STALE_SECONDS) {
    if (!device.worn) {
      return {
        kind: "not_worn",
        tone: "warn",
        title: "Vòng đang kết nối nhưng chưa được đeo",
        detail: "SpO₂ và nhịp tim để trống cho tới khi người bệnh đeo vòng.",
      };
    }
    return { kind: "live", tone: "ok", title: "Đang nhận dữ liệu", detail: `Qua điện thoại người nhà (BLE) · ${last}` };
  }
  if (age <= wifiWindow) {
    return {
      kind: "interrupted",
      tone: "warn",
      title: "Gián đoạn kết nối – tạm thời không nhận được SpO₂",
      detail: `Chưa nhận dữ liệu ${formatAgo(age)} (${last}). Điện thoại có thể đã mất Bluetooth với vòng hoặc mất mạng; nếu vòng đã được cài WiFi, vòng sẽ tự gửi qua WiFi dự phòng. Dữ liệu vẫn lưu trên vòng và gửi bù khi có kết nối.`,
    };
  }
  return {
    kind: "lost",
    tone: "bad",
    title: "Mất kết nối – không nhận được tín hiệu SpO₂",
    detail: `Không nhận dữ liệu từ vòng ${formatAgo(age)} (${last}). Số đo trên màn hình là số cũ. Kiểm tra app người nhà, pin vòng và WiFi nhà. Dữ liệu trong thời gian này sẽ được gửi bù khi vòng kết nối lại.`,
  };
}
