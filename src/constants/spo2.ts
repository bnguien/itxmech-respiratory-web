import {
  DEFAULT_SPO2_T,
  MODEL_EVAL_EVERY_MIN,
  MODEL_WINDOW_MIN,
  RULE_EVENT_MIN,
  formatClock,
  probFromQ,
  riskThresholds,
} from "@/lib/wearable/presentation";
import type {
  Assessment,
  MonitoringConfig,
  TelemetrySample,
  WearableLevel,
  WearableStatus,
} from "@/types/wearable";

export type Spo2Status = "normal" | "warning";
export interface Spo2ChartPoint {
  time: string;
  value: number;
  min?: number;
  status: Spo2Status;
}

export function getSpo2Status(value: number, threshold = DEFAULT_SPO2_T): Spo2Status {
  return value < threshold ? "warning" : "normal";
}

export function getSpo2StatusLabel(value: number, threshold = DEFAULT_SPO2_T) {
  return getSpo2Status(value, threshold) === "warning" ? "Dưới ngưỡng T" : "Trong ngưỡng";
}

// ---------------------------------------------------------------------------------------------
// Dữ liệu mẫu theo đúng định dạng firmware gửi lên (telemetry.v1 / assessment.v1 / status).
// Chưa có API đọc dữ liệu vòng; khi có, thay các hằng mock* bằng dữ liệu từ server.
// ---------------------------------------------------------------------------------------------

const MODEL_VERSION = "hybrid_tc-20261016-s3";
const DEVICE_ID = "WB-C3-0001";
const NOW_TS = 1792312200; // 18/10/2026 15:30 giờ Việt Nam
const HISTORY_MIN = 24 * 60;

export const mockMonitoringConfig: MonitoringConfig = {
  version: 9,
  T: DEFAULT_SPO2_T,
  ml_enabled: true,
  model_version: MODEL_VERSION,
  critical: { crit_T: 85, n_min: 3, hr_low: 40, hr_high: 140 },
  applied_version: 9,
};

export const mockWearableStatus: WearableStatus = {
  device_id: DEVICE_ID,
  ts: NOW_TS - 40,
  battery: 76,
  worn: true,
  charging: false,
  backlog: 0,
  config_version: 9,
  fw: "1.0.0",
  model_version: MODEL_VERSION,
  model_ready: true,
  transport: "ble_relay",
};

// Sinh số giả ổn định (cùng kết quả ở server và trình duyệt).
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function buildTelemetry(): TelemetrySample[] {
  const random = seeded(42);
  return Array.from({ length: HISTORY_MIN }, (_, index) => {
    const minutesAgo = HISTORY_MIN - 1 - index;
    const ts = NOW_TS - minutesAgo * 60;
    // Ban đêm giảm nhẹ, một đoạn tháo vòng, và một đợt tụt giảm dần 30 phút rồi hồi phục 15 phút.
    const night = index > 480 && index < 900 ? -1 : 0;
    const d = index - 1370;
    const dip = d >= 0 && d < 30 ? -9 * (d / 30) ** 1.3 : d >= 30 && d < 45 ? -9 * (1 - (d - 30) / 15) : 0;
    const removed = index >= 610 && index < 625;
    const mean = 94.6 + night + dip + Math.sin(index / 37) * 0.6 + (random() - 0.5) * 1.2;
    if (removed) {
      return { seq: 10_000 + index, ts, spo2_mean: null, spo2_min: null, spo2_valid: 0, pulse_mean: null, sqi: 0, worn: false };
    }
    return {
      seq: 10_000 + index,
      ts,
      spo2_mean: Math.round(mean * 10) / 10,
      spo2_min: Math.round((mean - 0.8 - random() * 1.2) * 10) / 10,
      spo2_valid: Math.round((0.9 + random() * 0.1) * 100) / 100,
      pulse_mean: Math.round(76 + (dip < 0 ? -dip * 2.5 : 0) + (random() - 0.5) * 6),
      sqi: Math.round((0.82 + random() * 0.15) * 100) / 100,
      worn: true,
    };
  });
}

// Mô phỏng gần đúng engine trên vòng để dữ liệu mẫu nhất quán: luật Critical/Alert mỗi phút,
// model chạy mỗi 5 phút khi đủ 60 phút; chỉ giữ bản ghi mỗi 5 phút hoặc khi đổi mức.
function buildAssessments(samples: TelemetrySample[], config: MonitoringConfig): Assessment[] {
  const { T } = config;
  const thresholds = riskThresholds(T);
  const items: Assessment[] = [];
  let lowRun = 0;
  let critRun = 0;
  let missing = 0;
  let previous: WearableLevel | null = null;
  samples.forEach((sample, index) => {
    const spo2 = sample.spo2_mean;
    missing = spo2 === null ? missing + 1 : 0;
    lowRun = spo2 !== null && spo2 < T ? lowRun + 1 : 0;
    critRun = spo2 !== null && spo2 < config.critical.crit_T ? critRun + 1 : 0;
    const t = index + 1;
    const ranModel = t >= MODEL_WINDOW_MIN && t % MODEL_EVAL_EVERY_MIN === 0 && missing === 0;
    let outQ: number | null = null;
    if (ranModel) {
      const recent = samples.slice(index - 9, index + 1).flatMap((item) => (item.spo2_mean === null ? [] : [item.spo2_mean]));
      const avg = recent.reduce((total, value) => total + value, 0) / recent.length;
      const slope = (recent.at(-1)! - recent[0]) / recent.length;
      const logit = 1.1 * (T + 3.5 - avg) - 4 * slope - 1.2;
      outQ = Math.min(127, Math.max(-128, Math.round(125 + logit / 0.0433892645)));
    }
    const prob = outQ === null ? null : probFromQ(outQ);
    let level: WearableLevel = "NORMAL";
    let trigger: Assessment["trigger"] = "none";
    if (missing > 0 || t < MODEL_WINDOW_MIN) {
      level = "UNKNOWN";
      trigger = missing > 0 ? "signal_lost" : "none";
    } else if (critRun >= config.critical.n_min) {
      level = "CRITICAL";
      trigger = "rule_critical";
    } else if (lowRun >= RULE_EVENT_MIN) {
      level = "ALERT";
      trigger = "rule_alert";
    } else if (prob !== null && prob >= thresholds.alert) {
      level = "ALERT";
      trigger = "ml_risk";
    } else if (prob !== null && prob >= thresholds.watch) {
      level = "WATCH";
      trigger = "ml_risk";
    } else if (previous === "WATCH" || previous === "ALERT") {
      level = prob === null ? previous : "NORMAL";
    }
    const changed = level !== previous;
    if (!ranModel && !changed) return;
    const notify = {
      watch: changed && level === "WATCH",
      alert: changed && level === "ALERT",
      critical: changed && level === "CRITICAL",
    };
    items.push({
      seq: sample.seq,
      ts: sample.ts,
      level,
      notify,
      trigger,
      critical_reason: trigger === "rule_critical" ? "spo2" : null,
      alert_by_rule: trigger === "rule_alert",
      ran_model: ranModel,
      out_q: outQ,
      prob: prob === null ? null : Math.round(prob * 1000) / 1000,
      T,
      baseline: t >= MODEL_WINDOW_MIN ? 94.3 : null,
      base_hours: Math.min(24, Math.max(0, (t - MODEL_WINDOW_MIN) / 60)),
      spo2_now: spo2,
      pulse_now: sample.pulse_mean,
      config_version: config.version,
      model_version: config.model_version,
      local_notified: notify.alert || notify.critical,
    });
    previous = level;
  });
  return items;
}

export const mockTelemetry = buildTelemetry();
export const mockAssessments = buildAssessments(mockTelemetry, mockMonitoringConfig);

// Biểu đồ 24 giờ: gộp bản ghi phút thành điểm 15 phút (SpO₂ trung bình và thấp nhất).
function bucketTelemetry(samples: TelemetrySample[], bucketMin: number, threshold: number): Spo2ChartPoint[] {
  const points: Spo2ChartPoint[] = [];
  for (let start = 0; start < samples.length; start += bucketMin) {
    const bucket = samples.slice(start, start + bucketMin);
    const valid = bucket.filter((sample) => sample.spo2_mean !== null);
    if (valid.length === 0) continue;
    const value = Math.round((valid.reduce((total, sample) => total + sample.spo2_mean!, 0) / valid.length) * 10) / 10;
    const min = Math.min(...valid.map((sample) => sample.spo2_min ?? sample.spo2_mean!));
    points.push({ time: formatClock(bucket[0].ts), value, min, status: getSpo2Status(min, threshold) });
  }
  return points;
}

export const spo2DataByRange: Record<"24h" | "7d" | "30d", Spo2ChartPoint[]> = {
  "24h": bucketTelemetry(mockTelemetry, 15, mockMonitoringConfig.T),
  "7d": [95.1, 94.6, 94.8, 94.2, 93.9, 93.6, 93.8].map((value, index) => ({
    time: `T${index + 2}`,
    value,
    min: [91, 90, 90, 89, 88, 87, 86][index],
    status: getSpo2Status([91, 90, 90, 89, 88, 87, 86][index], mockMonitoringConfig.T),
  })),
  "30d": [95.4, 95.1, 94.9, 95.0, 94.6, 94.7, 94.2, 94.0, 94.3, 93.9, 93.8].map((value, index) => ({
    time: `${index * 3 + 1}/09`,
    value,
    min: [92, 91, 91, 91, 90, 90, 89, 88, 89, 87, 86][index],
    status: getSpo2Status([92, 91, 91, 91, 90, 90, 89, 88, 89, 87, 86][index], mockMonitoringConfig.T),
  })),
};
