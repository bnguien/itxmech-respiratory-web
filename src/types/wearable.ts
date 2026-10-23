// Dữ liệu vòng đeo tay SpO₂, giữ nguyên tên trường snake_case như payload firmware gửi lên
// (telemetry.v1, assessment.v1, status, config.v1 trong firmware/docs/CONFIG_VA_API.md).

export type WearableLevel = "UNKNOWN" | "NORMAL" | "WATCH" | "ALERT" | "CRITICAL";
export type AssessmentTrigger =
  | "ml_risk"
  | "rule_alert"
  | "rule_critical"
  | "hr_out_of_range"
  | "signal_lost"
  | "none";
export type WearableTransport = "ble_relay" | "wifi";

/** Một bản ghi mỗi phút (telemetry.v1). Giá trị thiếu là null, không bao giờ là 0. */
export interface TelemetrySample {
  seq: number;
  ts: number; // epoch giây UTC
  spo2_mean: number | null;
  spo2_min: number | null;
  spo2_valid: number; // 0..1
  pulse_mean: number | null;
  sqi: number; // 0..1
  worn: boolean;
}

/** Kết quả của engine trên vòng (assessment.v1): gửi mỗi 5 phút và khi đổi mức hoặc có thông báo. */
export interface Assessment {
  seq: number;
  ts: number;
  level: WearableLevel;
  notify: { watch: boolean; alert: boolean; critical: boolean };
  trigger: AssessmentTrigger;
  critical_reason: "spo2" | "hr" | null;
  alert_by_rule: boolean;
  ran_model: boolean;
  out_q: number | null;
  prob: number | null;
  T: number;
  baseline: number | null;
  base_hours: number;
  spo2_now: number | null;
  pulse_now: number | null;
  config_version: number;
  model_version: string;
  local_notified: boolean;
}

export interface WearableStatus {
  device_id: string;
  ts: number;
  battery: number;
  worn: boolean;
  charging: boolean;
  backlog: number;
  config_version: number;
  fw: string;
  model_version: string;
  model_ready: boolean;
  transport: WearableTransport;
}

/** Số hiển thị 15 giây (LIVE v2) mới nhất: cùng số app người nhà đang thấy. */
export interface LiveReading {
  ts: number; // epoch giây, cuối cửa sổ đo
  spo2: number | null;
  spo2_min: number | null;
  pulse: number | null;
  worn: boolean;
  valid: number; // 0..1
}

/** Số liệu hiệu năng của vòng trong một cửa sổ 5 phút (DIAG, ble-gatt.md mục 3.9). */
export interface DeviceDiagnostic {
  ts: number;
  boot_id: number;
  uptime_s: number;
  cpu_avg_pct: number | null;
  cpu_peak_pct: number | null;
  model_ms: number | null;
  minute_ms: number | null;
  flash_ms: number | null;
  heap_min_kb: number | null;
  wifi_s: number | null;
  reset_reason: string;
  ble_drops: number | null;
  transport: WearableTransport;
}

/** Phần config.v1 mà web cần để hiển thị ngưỡng đang áp dụng. */
export interface MonitoringConfig {
  version: number;
  T: number;
  ml_enabled: boolean;
  model_version: string;
  critical: { crit_T: number; n_min: number; hr_low: number; hr_high: number };
  applied_version: number | null; // version vòng đã xác nhận (config-ack)
  /** Chu kỳ vòng tự gửi qua WiFi khi mất app (phút). */
  upload_interval_min?: number;
}
