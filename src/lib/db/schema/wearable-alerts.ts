import { sql } from "drizzle-orm";
import { bigint, check, index, jsonb, pgTable, real, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { doctorProfiles } from "./doctor-profiles";
import { patients } from "./patients";
import { wearableDevices } from "./wearables";

/**
 * Cảnh báo sinh từ assessment của vòng (mức ALERT / CRITICAL). Các phút liên tiếp cùng một đợt gộp vào một dòng
 * (cập nhật last_seen_at); ALERT lên CRITICAL thì nâng mức dòng đang mở. Bác sĩ bấm "Đã xem" để đóng.
 */
export const wearableAlerts = pgTable(
  "wearable_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    deviceId: text("device_id")
      .notNull()
      .references(() => wearableDevices.deviceId),
    level: text("level").notNull(),
    trigger: text("trigger").notNull(),
    spo2: real("spo2"),
    pulse: real("pulse"),
    thresholdT: real("threshold_t"),
    transport: text("transport"),
    sourceSeq: bigint("source_seq", { mode: "number" }).notNull(),
    openedAt: timestamp("opened_at", { withTimezone: true, mode: "string" }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }).notNull(),
    escalatedAt: timestamp("escalated_at", { withTimezone: true, mode: "string" }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true, mode: "string" }),
    acknowledgedBy: uuid("acknowledged_by").references(() => doctorProfiles.id),
    familyAckedAt: timestamp("family_acked_at", { withTimezone: true, mode: "string" }),
    familyAckedBy: text("family_acked_by"),
    feedback: jsonb("feedback"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("wearable_alerts_patient_opened_idx").on(table.patientId, table.openedAt),
    index("wearable_alerts_open_idx").on(table.openedAt).where(sql`${table.acknowledgedAt} is null`),
    check("wearable_alerts_level_check", sql`${table.level} in ('ALERT', 'CRITICAL')`),
  ],
);

export type WearableAlertRow = typeof wearableAlerts.$inferSelect;
