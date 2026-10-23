import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { patients } from "./patients";

/** Mã truy cập app của người nhà: một dòng cho mỗi bệnh nhân, chỉ lưu hash (scrypt). */
export const patientAppAccess = pgTable(
  "patient_app_access",
  {
    patientId: uuid("patient_id")
      .primaryKey()
      .references(() => patients.id, { onDelete: "cascade" }),
    accessCodeHash: text("access_code_hash").notNull(),
    /** Mã truy cập mã hóa AES-GCM để bác sĩ xem / in lại phiếu đăng nhập (null với mã cấp trước migration 0012). */
    accessCodeEnc: text("access_code_enc"),
    failedAttempts: integer("failed_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true, mode: "string" }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    check("patient_app_access_failed_attempts_check", sql`${table.failedAttempts} >= 0`),
  ],
);

/** Mỗi lần đăng nhập trên một máy. Refresh token chỉ lưu hash (SHA-256). */
export const appSessions = pgTable(
  "app_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    viewerName: text("viewer_name").notNull(),
    role: text("role").notNull(),
    isBleGateway: boolean("is_ble_gateway").default(false).notNull(),
    fcmToken: text("fcm_token"),
    appInstallId: text("app_install_id"),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    refreshExpiresAt: timestamp("refresh_expires_at", { withTimezone: true, mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("app_sessions_patient_id_idx").on(table.patientId),
    index("app_sessions_refresh_token_hash_idx").on(table.refreshTokenHash),
    check("app_sessions_role_check", sql`${table.role} in ('family', 'patient', 'doctor')`),
  ],
);

export type PatientAppAccessRow = typeof patientAppAccess.$inferSelect;
export type AppSessionRow = typeof appSessions.$inferSelect;
