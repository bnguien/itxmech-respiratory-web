import "server-only";

import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { vitalsMinute, wearableAssessments, wearableDevices } from "@/lib/db/schema/wearables";
import { currentDeviceOf } from "@/lib/app-api/server";
import { latestConfig } from "@/lib/monitoring/server";
import { RANGE_SPEC, toChartPoints, type BucketRow, type WearableRange } from "./chart";
import { probFromQ } from "./presentation";
import type { Spo2ChartPoint } from "@/constants/spo2";
import type {
  Assessment,
  AssessmentTrigger,
  MonitoringConfig,
  TelemetrySample,
  WearableLevel,
  WearableStatus,
} from "@/types/wearable";

export interface PatientWearableData {
  device: WearableStatus | null;
  config: MonitoringConfig;
  /** Bản ghi phút 24 giờ gần nhất (thẻ tóm tắt, thời gian chờ AI). */
  samples: TelemetrySample[];
  chart: Spo2ChartPoint[];
  /** Assessment 24 giờ gần nhất, cũ trước mới sau. */
  assessments: Assessment[];
}

const toEpoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);
const TRIGGERS: AssessmentTrigger[] = ["ml_risk", "rule_alert", "rule_critical", "hr_out_of_range", "signal_lost", "none"];

/** Dữ liệu SpO₂ thật của một bệnh nhân cho trang bác sĩ (đọc từ vitals_minute / assessments / wearable_devices). */
export async function readPatientWearable(patientId: string, range: WearableRange): Promise<PatientWearableData> {
  const now = Date.now();
  const since24h = new Date(now - 24 * 3600 * 1000).toISOString();
  const spec = RANGE_SPEC[range];
  const sinceRange = new Date(now - spec.hours * 3600 * 1000).toISOString();

  const [stored, device, sampleRows, assessmentRows, bucketRows] = await Promise.all([
    latestConfig(patientId),
    currentDeviceOf(patientId),
    db
      .select()
      .from(vitalsMinute)
      .where(and(eq(vitalsMinute.patientId, patientId), gte(vitalsMinute.ts, since24h)))
      .orderBy(asc(vitalsMinute.ts)),
    db
      .select()
      .from(wearableAssessments)
      .where(and(eq(wearableAssessments.patientId, patientId), gte(wearableAssessments.ts, since24h)))
      .orderBy(asc(wearableAssessments.ts)),
    db.execute(sql`
      select to_timestamp(floor(extract(epoch from ts) / ${spec.bucketSeconds}) * ${spec.bucketSeconds}) as bucket,
             avg(spo2_mean)::float8 as mean,
             min(coalesce(spo2_min, spo2_mean))::float8 as min
      from vitals_minute
      where patient_id = ${patientId} and ts >= ${sinceRange}
      group by bucket
      order by bucket
    `) as unknown as Promise<Array<{ bucket: string | Date; mean: number | null; min: number | null }>>,
  ]);

  const t = stored.thresholds;
  let deviceRow: typeof wearableDevices.$inferSelect | undefined;
  if (device) {
    [deviceRow] = await db.select().from(wearableDevices).where(eq(wearableDevices.deviceId, device.deviceId)).limit(1);
  }

  const config: MonitoringConfig = {
    version: stored.version,
    T: t.T,
    ml_enabled: t.ml_enabled,
    model_version: deviceRow?.modelVersion ?? "",
    critical: { crit_T: t.crit_T, n_min: t.crit_n_min, hr_low: t.hr_low, hr_high: t.hr_high },
    applied_version: deviceRow ? deviceRow.appliedConfigVersion : null,
  };

  const rows: BucketRow[] = bucketRows.map((r) => ({ bucket: new Date(r.bucket), mean: r.mean, min: r.min }));

  return {
    device: deviceRow
      ? {
          device_id: deviceRow.deviceId,
          ts: deviceRow.lastSeenAt ? toEpoch(deviceRow.lastSeenAt) : 0,
          battery: deviceRow.batteryPct ?? -1,
          worn: deviceRow.worn ?? false,
          charging: false,
          backlog: deviceRow.backlog ?? 0,
          config_version: deviceRow.appliedConfigVersion,
          fw: deviceRow.fw ?? "",
          model_version: deviceRow.modelVersion ?? "",
          model_ready: true,
          transport: deviceRow.transport === "wifi" ? "wifi" : "ble_relay",
        }
      : null,
    config,
    samples: sampleRows.map((s) => ({
      seq: s.seq,
      ts: toEpoch(s.ts),
      spo2_mean: s.spo2Mean,
      spo2_min: s.spo2Min,
      spo2_valid: s.spo2Valid,
      pulse_mean: s.pulseMean,
      sqi: s.sqi ?? 0,
      worn: s.worn ?? false,
    })),
    chart: toChartPoints(rows, range, t.T),
    assessments: assessmentRows.map((a) => {
      const notify = (a.notify ?? {}) as { watch?: boolean; alert?: boolean; critical?: boolean };
      const trigger = (TRIGGERS as string[]).includes(a.trigger) ? (a.trigger as AssessmentTrigger) : "none";
      return {
        seq: a.seq,
        ts: toEpoch(a.ts),
        level: a.level as WearableLevel,
        notify: { watch: !!notify.watch, alert: !!notify.alert, critical: !!notify.critical },
        trigger,
        critical_reason: trigger === "rule_critical" ? "spo2" : trigger === "hr_out_of_range" ? "hr" : null,
        alert_by_rule: trigger === "rule_alert",
        ran_model: a.ranModel,
        out_q: a.outQ,
        prob: a.ranModel && a.outQ !== null ? probFromQ(a.outQ) : null,
        T: a.thresholdT,
        baseline: null,
        base_hours: 0,
        spo2_now: a.spo2Now,
        pulse_now: a.pulseNow !== null ? Math.round(a.pulseNow) : null,
        config_version: a.configVersion,
        model_version: a.modelVersion,
        local_notified: a.localNotified,
      };
    }),
  };
}
