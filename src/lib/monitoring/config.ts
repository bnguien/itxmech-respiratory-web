// Ngưỡng theo dõi SpO₂ do bác sĩ đặt (config.v1). Hàm thuần, dùng chung cho API bác sĩ, API app và test.
// Quy tắc kiểm tra theo SPO2-RESEARCH/respiratory-risk-classifier/firmware/docs/CONFIG_VA_API.md §3.2:
// firmware kiểm tra lại đúng các điều kiện này và từ chối cả gói nếu sai.

export const CURRENT_MODEL_VERSION = "hybrid_tc-20261016-s3";
export const T_MIN = 85;
export const T_MAX = 95;

/** Ngưỡng INT8 của model theo T (spo2_tc_params.h). Firmware chỉ dùng để đối chiếu; lệch thì tắt AI. */
const WATCH_THR_Q = [54, 54, 63, 71, 79, 87, 94, 101, 106, 110, 110];
const ALERT_THR_Q = [71, 71, 79, 86, 93, 101, 105, 109, 114, 117, 117];

export function thresholdsInt8(T: number) {
  const index = Math.min(Math.max(T, T_MIN), T_MAX) - T_MIN;
  return { watch: WATCH_THR_Q[index], alert: ALERT_THR_Q[index] };
}

export interface MonitoringThresholds {
  T: number;
  crit_T: number;
  crit_n_min: number;
  crit_sqi: number;
  hr_low: number;
  hr_high: number;
  ml_enabled: boolean;
  watch_k: number;
  watch_n: number;
  watch_cooldown: number;
  alert_k: number;
  alert_n: number;
  alert_cooldown: number;
  crit_cooldown: number;
  upload_interval_min: number;
}

/** Ngưỡng xuất xưởng (version 0), giống spo2tc_config_default() trên vòng. */
export const DEFAULT_THRESHOLDS: MonitoringThresholds = {
  T: 88,
  crit_T: 85,
  crit_n_min: 3,
  crit_sqi: 0.5,
  hr_low: 40,
  hr_high: 140,
  ml_enabled: true,
  watch_k: 1,
  watch_n: 1,
  watch_cooldown: 30,
  alert_k: 1,
  alert_n: 1,
  alert_cooldown: 60,
  crit_cooldown: 30,
  upload_interval_min: 10,
};

type Result<T> = { data: T; error?: never } | { data?: never; error: string };

const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const between = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

/**
 * Bác sĩ chỉ sửa các trường hiện trên form; trường thiếu giữ theo [base]. Gói BLE 16 byte chỉ mang một cặp k/n
 * cho cả Watch và Alert nên watch_k/n luôn bằng alert_k/n.
 */
export function validateThresholds(input: unknown, base: MonitoringThresholds = DEFAULT_THRESHOLDS): Result<MonitoringThresholds> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { error: "Thiếu dữ liệu ngưỡng." };
  const body = input as Record<string, unknown>;
  const pick = (key: keyof MonitoringThresholds) => (key in body ? body[key] : base[key]);

  const T = pick("T"), critT = pick("crit_T"), nMin = pick("crit_n_min"), hrLow = pick("hr_low"), hrHigh = pick("hr_high");
  const k = pick("alert_k"), n = pick("alert_n"), alertCd = pick("alert_cooldown"), watchCd = pick("watch_cooldown");
  const critCd = pick("crit_cooldown"), upload = pick("upload_interval_min"), sqi = pick("crit_sqi"), ml = pick("ml_enabled");

  if (!isInt(T) || !between(T, T_MIN, T_MAX)) return { error: `Ngưỡng T phải từ ${T_MIN} đến ${T_MAX}%.` };
  if (!isInt(critT) || !between(critT, 70, T - 1)) return { error: "Ngưỡng nguy hiểm phải từ 70% và thấp hơn T." };
  if (!isInt(nMin) || !between(nMin, 1, 10)) return { error: "Số phút liên tiếp cho mức nguy hiểm từ 1 đến 10." };
  if (!isInt(hrLow) || (hrLow !== 0 && !between(hrLow, 30, 80))) return { error: "Nhịp tim thấp: 0 (tắt) hoặc 30–80." };
  if (!isInt(hrHigh) || (hrHigh !== 0 && (!between(hrHigh, 100, 220) || hrHigh <= hrLow))) {
    return { error: "Nhịp tim cao: 0 (tắt) hoặc 100–220 và lớn hơn nhịp thấp." };
  }
  if (!isInt(k) || !isInt(n) || !(1 <= k && k <= n && n <= 16)) return { error: "Persistence k/n không hợp lệ (1 ≤ k ≤ n ≤ 16)." };
  const cooldownOk = (v: unknown): v is number => isInt(v) && between(v, 5, 240);
  if (!cooldownOk(alertCd)) return { error: "Thời gian chờ báo lại mức cảnh báo từ 5 đến 240 phút." };
  if (!cooldownOk(watchCd)) return { error: "Thời gian chờ báo lại mức theo dõi từ 5 đến 240 phút." };
  if (!cooldownOk(critCd)) return { error: "Thời gian chờ báo lại mức nguy hiểm từ 5 đến 240 phút." };
  if (!isInt(upload) || !between(upload, 1, 60)) return { error: "Chu kỳ gửi WiFi từ 1 đến 60 phút." };
  if (typeof sqi !== "number" || !between(sqi, 0, 1)) return { error: "Chất lượng tín hiệu tối thiểu từ 0 đến 1." };
  if (typeof ml !== "boolean") return { error: "ml_enabled phải là true/false." };

  return {
    data: {
      T, crit_T: critT, crit_n_min: nMin, crit_sqi: sqi, hr_low: hrLow, hr_high: hrHigh, ml_enabled: ml,
      watch_k: k, watch_n: n, watch_cooldown: watchCd, alert_k: k, alert_n: n, alert_cooldown: alertCd,
      crit_cooldown: critCd, upload_interval_min: upload,
    },
  };
}

export interface StoredConfig {
  version: number;
  preset: string | null;
  thresholds: MonitoringThresholds;
  setBy: string | null;
  updatedAt: string | null;
}

/** config.v1 gửi cho app (app ghi xuống vòng qua BLE CONFIG). */
export function toConfigV1(
  config: StoredConfig,
  device: { deviceId: string | null; assignmentId: number | null; appliedVersion: number | null },
) {
  const t = config.thresholds;
  return {
    schema: "config.v1",
    device_id: device.deviceId,
    assignment_id: device.assignmentId,
    version: config.version,
    preset: config.preset ?? "custom",
    model_version: CURRENT_MODEL_VERSION,
    T: t.T,
    ml_enabled: t.ml_enabled,
    thr_q: thresholdsInt8(t.T),
    tiers: {
      watch: { k: t.watch_k, n: t.watch_n, cooldown: t.watch_cooldown },
      alert: { k: t.alert_k, n: t.alert_n, cooldown: t.alert_cooldown },
    },
    critical: {
      crit_T: t.crit_T, n_min: t.crit_n_min, sqi_min: t.crit_sqi, hr_low: t.hr_low, hr_high: t.hr_high, cooldown: t.crit_cooldown,
    },
    uplink: { upload_interval_min: t.upload_interval_min },
    set_by: config.setBy,
    updated_at: config.updatedAt,
    applied_on_device: device.appliedVersion !== null && device.appliedVersion >= config.version,
  };
}

export const defaultStoredConfig = (): StoredConfig => ({
  version: 0,
  preset: "default",
  thresholds: DEFAULT_THRESHOLDS,
  setBy: null,
  updatedAt: null,
});
