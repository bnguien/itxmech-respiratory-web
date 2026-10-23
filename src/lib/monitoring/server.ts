import "server-only";

import { desc, eq, max } from "drizzle-orm";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";
import { monitoringConfigs, type MonitoringConfigRow } from "@/lib/db/schema/monitoring-configs";
import { defaultStoredConfig, type MonitoringThresholds, type StoredConfig } from "./config";

function toStored(row: MonitoringConfigRow, doctorName: string | null): StoredConfig {
  return {
    version: row.version,
    preset: row.preset,
    setBy: doctorName,
    updatedAt: new Date(row.createdAt).toISOString(),
    thresholds: {
      T: row.thresholdT,
      crit_T: row.critT,
      crit_n_min: row.critNMin,
      crit_sqi: row.critSqi,
      hr_low: row.hrLow,
      hr_high: row.hrHigh,
      ml_enabled: row.mlEnabled,
      watch_k: row.watchK,
      watch_n: row.watchN,
      watch_cooldown: row.watchCooldown,
      alert_k: row.alertK,
      alert_n: row.alertN,
      alert_cooldown: row.alertCooldown,
      crit_cooldown: row.critCooldown,
      upload_interval_min: row.uploadIntervalMin,
    },
  };
}

/** Các version gần nhất, mới trước. Chưa có thì trả mảng rỗng (đang dùng ngưỡng xuất xưởng v0). */
export async function configHistory(patientId: string, limit = 10): Promise<StoredConfig[]> {
  const rows = await db
    .select({ config: monitoringConfigs, doctorName: doctorProfiles.fullName })
    .from(monitoringConfigs)
    .leftJoin(doctorProfiles, eq(doctorProfiles.id, monitoringConfigs.setBy))
    .where(eq(monitoringConfigs.patientId, patientId))
    .orderBy(desc(monitoringConfigs.version))
    .limit(limit);
  return rows.map((r) => toStored(r.config, r.doctorName));
}

export async function latestConfig(patientId: string): Promise<StoredConfig> {
  return (await configHistory(patientId, 1))[0] ?? defaultStoredConfig();
}

export async function latestConfigVersion(patientId: string): Promise<number> {
  const [row] = await db
    .select({ value: max(monitoringConfigs.version) })
    .from(monitoringConfigs)
    .where(eq(monitoringConfigs.patientId, patientId));
  return row?.value ?? 0;
}

/** Cột ngưỡng của một dòng monitoring_configs, dùng chung cho đổi ngưỡng và tạo bệnh nhân mới. */
export function thresholdColumns(t: MonitoringThresholds) {
  return {
    thresholdT: t.T,
    critT: t.crit_T,
    critNMin: t.crit_n_min,
    critSqi: t.crit_sqi,
    hrLow: t.hr_low,
    hrHigh: t.hr_high,
    mlEnabled: t.ml_enabled,
    watchK: t.watch_k,
    watchN: t.watch_n,
    watchCooldown: t.watch_cooldown,
    alertK: t.alert_k,
    alertN: t.alert_n,
    alertCooldown: t.alert_cooldown,
    critCooldown: t.crit_cooldown,
    uploadIntervalMin: t.upload_interval_min,
  };
}

/** Lưu ngưỡng mới thành version kế tiếp. Hai bác sĩ lưu cùng lúc: khóa (patient_id, version) chặn trùng, thử lại một lần. */
export async function createConfig(
  patientId: string,
  doctorId: string,
  t: MonitoringThresholds,
  preset: string | null,
  note: string | null,
): Promise<number> {
  for (let attempt = 0; ; attempt++) {
    try {
      const version = (await latestConfigVersion(patientId)) + 1;
      await db.insert(monitoringConfigs).values({
        patientId,
        version,
        preset,
        ...thresholdColumns(t),
        note,
        setBy: doctorId,
      });
      return version;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "23505" || attempt >= 1) throw error;
    }
  }
}
