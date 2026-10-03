import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { doctorProfiles } from "./doctor-profiles";
import { patients } from "./patients";

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctorProfiles.id),
    clinicalNote: text("clinical_note"),
    status: text("status").default("in_progress").notNull(),
    version: integer("version").default(1).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", {
      withTimezone: true,
      mode: "string",
    }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "visits_status_check",
      sql`${table.status} in ('in_progress', 'completed', 'cancelled')`,
    ),
    check("visits_version_check", sql`${table.version} >= 1`),
    index("visits_patient_id_idx").on(table.patientId),
    index("visits_doctor_id_idx").on(table.doctorId),
    index("visits_started_at_idx").on(table.startedAt),
    index("visits_status_idx").on(table.status),
  ],
);

export type VisitRow = typeof visits.$inferSelect;
export type NewVisitRow = typeof visits.$inferInsert;
