import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";

/** Vòng đeo SpO₂ (ESP32-C3 + MAX30102). device_key_hash dùng cho đường WiFi trực tiếp (chưa bật). */
export const wearableDevices = pgTable("wearable_devices", {
  deviceId: text("device_id").primaryKey(),
  deviceKeyHash: text("device_key_hash"),
  batteryPct: smallint("battery_pct"),
  worn: boolean("worn"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" }),
  transport: text("transport"),
  fw: text("fw"),
  modelVersion: text("model_version"),
  bootId: integer("boot_id"),
  backlog: integer("backlog"),
  lastSeq: bigint("last_seq", { mode: "number" }),
  appliedConfigVersion: integer("applied_config_version").default(0).notNull(),
  configStatus: text("config_status"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

/** Vòng nào đang giao cho bệnh nhân nào. Mỗi vòng chỉ một dòng đang mở (unassigned_at null). */
export const deviceAssignments = pgTable(
  "device_assignments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    deviceId: text("device_id")
      .notNull()
      .references(() => wearableDevices.deviceId),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    assignedAt: timestamp("assigned_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    unassignedAt: timestamp("unassigned_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    uniqueIndex("device_assignments_open_device_unique")
      .on(table.deviceId)
      .where(sql`${table.unassignedAt} is null`),
    index("device_assignments_patient_id_idx").on(table.patientId),
  ],
);

/** Bản ghi phút (telemetry.v1). Khóa (device_id, seq): gửi lại không bị trùng. */
export const vitalsMinute = pgTable(
  "vitals_minute",
  {
    deviceId: text("device_id")
      .notNull()
      .references(() => wearableDevices.deviceId),
    seq: bigint("seq", { mode: "number" }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    ts: timestamp("ts", { withTimezone: true, mode: "string" }).notNull(),
    spo2Mean: real("spo2_mean"),
    spo2Min: real("spo2_min"),
    spo2Valid: real("spo2_valid").notNull(),
    pulseMean: real("pulse_mean"),
    sqi: real("sqi"),
    worn: boolean("worn"),
    transport: text("transport").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.seq] }),
    index("vitals_minute_patient_ts_idx").on(table.patientId, table.ts),
    check("vitals_minute_transport_check", sql`${table.transport} in ('ble_relay', 'wifi')`),
  ],
);

/** Kết quả luật + model trên vòng (assessment.v1). */
export const wearableAssessments = pgTable(
  "assessments",
  {
    deviceId: text("device_id")
      .notNull()
      .references(() => wearableDevices.deviceId),
    seq: bigint("seq", { mode: "number" }).notNull(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    ts: timestamp("ts", { withTimezone: true, mode: "string" }).notNull(),
    level: text("level").notNull(),
    trigger: text("trigger").notNull(),
    notify: jsonb("notify").notNull(),
    ranModel: boolean("ran_model").notNull(),
    outQ: smallint("out_q"),
    thresholdT: smallint("threshold_t").notNull(),
    spo2Now: real("spo2_now"),
    pulseNow: real("pulse_now"),
    reasons: text("reasons").array().default(sql`'{}'::text[]`).notNull(),
    localNotified: boolean("local_notified").default(false).notNull(),
    configVersion: integer("config_version").notNull(),
    modelVersion: text("model_version").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.deviceId, table.seq] }),
    index("assessments_patient_ts_idx").on(table.patientId, table.ts),
    check(
      "assessments_level_check",
      sql`${table.level} in ('UNKNOWN', 'NORMAL', 'WATCH', 'ALERT', 'CRITICAL')`,
    ),
  ],
);

export type WearableDeviceRow = typeof wearableDevices.$inferSelect;
export type VitalsMinuteRow = typeof vitalsMinute.$inferSelect;
