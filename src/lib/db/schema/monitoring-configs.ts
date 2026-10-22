import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  integer,
  pgTable,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { doctorProfiles } from "./doctor-profiles";
import { patients } from "./patients";

/**
 * Ngưỡng theo dõi SpO₂ bác sĩ đặt cho từng bệnh nhân. Mỗi lần sửa là một version mới (không ghi đè),
 * vòng chỉ áp dụng version lớn hơn bản đang dùng. Version 0 là ngưỡng xuất xưởng, không lưu ở bảng này.
 */
export const monitoringConfigs = pgTable(
  "monitoring_configs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    preset: text("preset"),
    thresholdT: smallint("threshold_t").notNull(),
    critT: smallint("crit_t").notNull(),
    critNMin: smallint("crit_n_min").notNull(),
    critSqi: real("crit_sqi").notNull(),
    hrLow: smallint("hr_low").notNull(),
    hrHigh: smallint("hr_high").notNull(),
    mlEnabled: boolean("ml_enabled").notNull(),
    watchK: smallint("watch_k").notNull(),
    watchN: smallint("watch_n").notNull(),
    watchCooldown: smallint("watch_cooldown").notNull(),
    alertK: smallint("alert_k").notNull(),
    alertN: smallint("alert_n").notNull(),
    alertCooldown: smallint("alert_cooldown").notNull(),
    critCooldown: smallint("crit_cooldown").notNull(),
    uploadIntervalMin: smallint("upload_interval_min").notNull(),
    note: text("note"),
    setBy: uuid("set_by").references(() => doctorProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("monitoring_configs_patient_version_unique").on(table.patientId, table.version),
    check("monitoring_configs_version_check", sql`${table.version} >= 1`),
    check("monitoring_configs_t_check", sql`${table.thresholdT} between 85 and 95`),
  ],
);

export type MonitoringConfigRow = typeof monitoringConfigs.$inferSelect;
