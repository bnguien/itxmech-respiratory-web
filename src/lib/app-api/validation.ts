// Kiểm tra payload của /api/app/v1 (hàm thuần, test không cần DB). Tên trường snake_case như app gửi.

export const PATIENT_CODE_PATTERN = /^PAT-\d{6}$/;
export const ACCESS_CODE_PATTERN = /^\d{6}$/;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;
const MAX_TELEMETRY_BATCH = 120;
const MAX_ASSESSMENT_BATCH = 50;
const LEVELS = ["UNKNOWN", "NORMAL", "WATCH", "ALERT", "CRITICAL"] as const;
const ROLES = ["family", "patient", "doctor"] as const;
const MIN_TS = 1_600_000_000; // ts nhỏ hơn: vòng chưa đồng bộ giờ

type Result<T> = { data: T; error?: never } | { data?: never; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const optNum = (v: unknown) => (v === null || v === undefined ? null : isNum(v) ? v : undefined);
const optStr = (v: unknown, max = 200) =>
  v === null || v === undefined ? null : typeof v === "string" && v.length <= max ? v : undefined;

export interface LoginInput {
  patient_code: string;
  access_code: string;
  viewer_name: string;
  role: (typeof ROLES)[number];
  is_ble_gateway: boolean;
  fcm_token: string | null;
  app_install_id: string | null;
}

export function validateLogin(body: unknown): Result<LoginInput> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu đăng nhập." };
  const code = typeof body.patient_code === "string" ? body.patient_code.trim().toUpperCase() : "";
  const access = typeof body.access_code === "string" ? body.access_code.trim() : "";
  if (!PATIENT_CODE_PATTERN.test(code)) return { error: "Mã bệnh nhân có dạng PAT-000001." };
  if (!ACCESS_CODE_PATTERN.test(access)) return { error: "Mã truy cập gồm 6 chữ số." };
  const viewer = typeof body.viewer_name === "string" ? body.viewer_name.trim() : "";
  if (viewer.length < 1 || viewer.length > 60) return { error: "Tên người xem từ 1 đến 60 ký tự." };
  const role = typeof body.role === "string" ? body.role.toLowerCase() : "family";
  if (!(ROLES as readonly string[]).includes(role)) return { error: "Vai trò không hợp lệ." };
  const fcm = optStr(body.fcm_token, 4096);
  const install = optStr(body.app_install_id, 100);
  if (fcm === undefined || install === undefined) return { error: "Thông tin máy không hợp lệ." };
  return {
    data: {
      patient_code: code,
      access_code: access,
      viewer_name: viewer,
      role: role as LoginInput["role"],
      is_ble_gateway: body.is_ble_gateway === true,
      fcm_token: fcm,
      app_install_id: install,
    },
  };
}

export interface TelemetrySampleInput {
  seq: number;
  ts: number;
  spo2_mean: number | null;
  spo2_min: number | null;
  spo2_valid: number;
  pulse_mean: number | null;
  sqi: number | null;
  worn: boolean | null;
}

export interface TelemetryInput {
  device_id: string;
  boot_id: number | null;
  fw: string | null;
  model_version: string | null;
  config_version: number | null;
  transport: "ble_relay" | "wifi";
  samples: TelemetrySampleInput[];
  /** seq lớn nhất trong request, kể cả bản ghi bị bỏ: dùng làm acked_seq để app không gửi lại mãi. */
  max_seq: number;
}

/** Bản ghi chưa có giờ thật (ts nhỏ) bị bỏ, không làm hỏng cả lô. */
export function validateTelemetry(body: unknown): Result<TelemetryInput> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id)) {
    return { error: "device_id không hợp lệ." };
  }
  if (!Array.isArray(body.samples) || body.samples.length > MAX_TELEMETRY_BATCH) {
    return { error: `samples phải là mảng tối đa ${MAX_TELEMETRY_BATCH} phần tử.` };
  }
  const samples: TelemetrySampleInput[] = [];
  let maxSeq = -1;
  for (const s of body.samples) {
    if (!isObject(s) || !isInt(s.seq) || s.seq < 0 || !isInt(s.ts) || !isNum(s.spo2_valid)) {
      return { error: "Bản ghi thiếu seq, ts hoặc spo2_valid." };
    }
    maxSeq = Math.max(maxSeq, s.seq);
    const mean = optNum(s.spo2_mean), min = optNum(s.spo2_min), pulse = optNum(s.pulse_mean), sqi = optNum(s.sqi);
    if (mean === undefined || min === undefined || pulse === undefined || sqi === undefined) {
      return { error: `Bản ghi seq ${s.seq} có giá trị không phải số.` };
    }
    if (s.ts < MIN_TS) continue;
    samples.push({
      seq: s.seq,
      ts: s.ts,
      spo2_mean: mean,
      spo2_min: min,
      spo2_valid: Math.min(Math.max(s.spo2_valid, 0), 1),
      pulse_mean: pulse,
      sqi,
      worn: typeof s.worn === "boolean" ? s.worn : null,
    });
  }
  return {
    data: {
      device_id: body.device_id,
      boot_id: isInt(body.boot_id) ? body.boot_id : null,
      fw: optStr(body.fw, 40) ?? null,
      model_version: optStr(body.model_version, 80) ?? null,
      config_version: isInt(body.config_version) ? body.config_version : null,
      transport: body.transport === "wifi" ? "wifi" : "ble_relay",
      samples,
      max_seq: maxSeq,
    },
  };
}

export interface AssessmentItemInput {
  seq: number;
  ts: number;
  level: (typeof LEVELS)[number];
  trigger: string;
  notify: { watch: boolean; alert: boolean; critical: boolean };
  ran_model: boolean;
  out_q: number | null;
  T: number;
  spo2_now: number | null;
  pulse_now: number | null;
  reasons: string[];
  local_notified: boolean;
  config_version: number;
  model_version: string;
}

export function validateAssessments(body: unknown): Result<{ device_id: string; items: AssessmentItemInput[] }> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id)) {
    return { error: "device_id không hợp lệ." };
  }
  if (!Array.isArray(body.items) || body.items.length > MAX_ASSESSMENT_BATCH) {
    return { error: `items phải là mảng tối đa ${MAX_ASSESSMENT_BATCH} phần tử.` };
  }
  const items: AssessmentItemInput[] = [];
  for (const a of body.items) {
    if (!isObject(a) || !isInt(a.seq) || !isInt(a.ts) || !isInt(a.T) || !isInt(a.config_version)) {
      return { error: "Assessment thiếu seq, ts, T hoặc config_version." };
    }
    if (typeof a.level !== "string" || !(LEVELS as readonly string[]).includes(a.level)) {
      return { error: `Assessment seq ${a.seq} có level không hợp lệ.` };
    }
    const notify = isObject(a.notify) ? a.notify : {};
    if (a.ts < MIN_TS) continue;
    items.push({
      seq: a.seq,
      ts: a.ts,
      level: a.level as AssessmentItemInput["level"],
      trigger: typeof a.trigger === "string" ? a.trigger.slice(0, 40) : "none",
      notify: { watch: notify.watch === true, alert: notify.alert === true, critical: notify.critical === true },
      ran_model: a.ran_model === true,
      out_q: isInt(a.out_q) ? a.out_q : null,
      T: a.T,
      spo2_now: optNum(a.spo2_now) ?? null,
      pulse_now: optNum(a.pulse_now) ?? null,
      reasons: Array.isArray(a.reasons) ? a.reasons.filter((r): r is string => typeof r === "string").slice(0, 16) : [],
      local_notified: a.local_notified === true,
      config_version: a.config_version,
      model_version: typeof a.model_version === "string" ? a.model_version.slice(0, 80) : "",
    });
  }
  return { data: { device_id: body.device_id, items } };
}

export interface StatusInput {
  device_id: string;
  boot_id: number | null;
  battery: number | null;
  worn: boolean | null;
  backlog: number | null;
  last_seq: number | null;
  config_version: number | null;
  fw: string | null;
  model_version: string | null;
  transport: "ble_relay" | "wifi";
}

export function validateStatus(body: unknown): Result<StatusInput> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id)) {
    return { error: "device_id không hợp lệ." };
  }
  const battery = isInt(body.battery) && body.battery >= 0 && body.battery <= 100 ? body.battery : null;
  return {
    data: {
      device_id: body.device_id,
      boot_id: isInt(body.boot_id) ? body.boot_id : null,
      battery,
      worn: typeof body.worn === "boolean" ? body.worn : null,
      backlog: isInt(body.backlog) ? body.backlog : null,
      last_seq: isInt(body.last_seq) ? body.last_seq : null,
      config_version: isInt(body.config_version) ? body.config_version : null,
      fw: optStr(body.fw, 40) ?? null,
      model_version: optStr(body.model_version, 80) ?? null,
      transport: body.transport === "wifi" ? "wifi" : "ble_relay",
    },
  };
}

export interface LiveInput {
  device_id: string;
  ts: number;
  spo2: number | null;
  spo2_min: number | null;
  pulse: number | null;
  /** 0–1 */
  sqi: number | null;
  /** tỷ lệ giây hợp lệ trong cửa sổ, 0–1 */
  valid: number;
  worn: boolean;
}

/** Số hiển thị 15 giây (LIVE v2) app gateway chuyển tiếp. Chưa có giờ thật thì từ chối (không có "đo lúc"). */
export function validateLive(body: unknown): Result<LiveInput> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id)) {
    return { error: "device_id không hợp lệ." };
  }
  if (!isInt(body.ts) || body.ts < MIN_TS) return { error: "ts phải là epoch giây (vòng đã đồng bộ giờ)." };
  const spo2 = optNum(body.spo2), min = optNum(body.spo2_min), pulse = optNum(body.pulse), sqi = optNum(body.sqi);
  if (spo2 === undefined || min === undefined || pulse === undefined || sqi === undefined || !isNum(body.valid)) {
    return { error: "spo2, spo2_min, pulse, sqi, valid phải là số hoặc null." };
  }
  const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);
  return {
    data: {
      device_id: body.device_id,
      ts: body.ts,
      spo2,
      spo2_min: min,
      pulse,
      sqi: sqi === null ? null : clamp01(sqi),
      valid: clamp01(body.valid),
      worn: body.worn === true,
    },
  };
}

const RESET_REASONS = [
  "UNKNOWN", "POWERON", "EXT", "SW", "PANIC", "INT_WDT", "TASK_WDT", "WDT",
  "DEEPSLEEP", "BROWNOUT", "SDIO", "USB", "JTAG", "EFUSE", "PWR_GLITCH", "CPU_LOCKUP",
] as const;
const MAX_DIAG_BATCH = 48;

export interface DiagnosticItemInput {
  ts: number;
  uptime_s: number;
  boot_id: number;
  cpu_avg_pct: number | null;
  cpu_peak_pct: number | null;
  model_ms: number | null;
  minute_ms: number | null;
  flash_ms: number | null;
  heap_min_kb: number | null;
  wifi_s: number | null;
  reset_reason: string;
  ble_drops: number | null;
}

/**
 * Số liệu hiệu năng (DIAG, ble-gatt.md mục 3.9), từ app chuyển tiếp hoặc vòng tự gửi qua WiFi.
 * Mục ghi lúc vòng chưa có giờ (ts nhỏ) vẫn nhận: dùng giờ server nhận thay cho ts.
 */
export function validateDiagnostics(
  body: unknown,
  nowSeconds = Math.floor(Date.now() / 1000),
): Result<{ device_id: string; transport: "ble_relay" | "wifi"; items: DiagnosticItemInput[] }> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id)) {
    return { error: "device_id không hợp lệ." };
  }
  if (!Array.isArray(body.items) || body.items.length > MAX_DIAG_BATCH) {
    return { error: `items phải là mảng tối đa ${MAX_DIAG_BATCH} phần tử.` };
  }
  const items: DiagnosticItemInput[] = [];
  const small = (v: unknown) => (isInt(v) && v >= 0 && v <= 32767 ? v : null);
  const num = (v: unknown) => (isNum(v) && v >= 0 ? v : null);
  for (const d of body.items) {
    if (!isObject(d) || !isInt(d.uptime_s) || d.uptime_s < 0 || !isInt(d.boot_id) || d.boot_id < 0 || !isInt(d.ts)) {
      return { error: "Mục DIAG thiếu ts, uptime_s hoặc boot_id." };
    }
    const reason = typeof d.reset_reason === "string" ? d.reset_reason.toUpperCase() : "UNKNOWN";
    items.push({
      ts: d.ts < MIN_TS ? nowSeconds : d.ts,
      uptime_s: d.uptime_s,
      boot_id: d.boot_id,
      cpu_avg_pct: num(d.cpu_avg_pct),
      cpu_peak_pct: num(d.cpu_peak_pct),
      model_ms: num(d.model_ms),
      minute_ms: num(d.minute_ms),
      flash_ms: num(d.flash_ms),
      heap_min_kb: small(d.heap_min_kb),
      wifi_s: small(d.wifi_s),
      reset_reason: (RESET_REASONS as readonly string[]).includes(reason) ? reason : "UNKNOWN",
      ble_drops: small(d.ble_drops),
    });
  }
  return { data: { device_id: body.device_id, transport: body.transport === "wifi" ? "wifi" : "ble_relay", items } };
}

export function validateConfigAck(body: unknown): Result<{ device_id: string; config_version: number; status: string }> {
  if (!isObject(body)) return { error: "Thiếu dữ liệu." };
  if (typeof body.device_id !== "string" || !DEVICE_ID_PATTERN.test(body.device_id) || !isInt(body.config_version)) {
    return { error: "Thiếu device_id hoặc config_version." };
  }
  const status = typeof body.status === "string" ? body.status : "";
  if (!["applied", "applied_rules_only", "rejected"].includes(status)) return { error: "status không hợp lệ." };
  return { data: { device_id: body.device_id, config_version: body.config_version, status } };
}

/** Khoảng thời gian cho GET /vitals. */
export function parseVitalsRange(
  from: string | null,
  to: string | null,
  resolution: string | null,
): Result<{ from: Date; to: Date; bucketSeconds: number; resolution: string }> {
  const buckets: Record<string, number> = { "1m": 60, "5m": 300, "1h": 3600 };
  const res = resolution ?? "1m";
  if (!(res in buckets)) return { error: "resolution là 1m, 5m hoặc 1h." };
  const f = from ? new Date(from) : null;
  const t = to ? new Date(to) : null;
  if (!f || !t || Number.isNaN(f.getTime()) || Number.isNaN(t.getTime()) || f >= t) {
    return { error: "from/to phải là thời điểm ISO 8601 và from < to." };
  }
  if (t.getTime() - f.getTime() > 31 * 24 * 3600 * 1000) return { error: "Tối đa 31 ngày mỗi lần." };
  return { data: { from: f, to: t, bucketSeconds: buckets[res], resolution: res } };
}
