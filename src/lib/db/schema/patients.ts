import {
  date,
  check,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { doctorProfiles } from "./doctor-profiles";

export const patientCodeSequence = pgSequence("patient_code_seq");

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientCode: text("patient_code")
      .default(
        sql`'PAT-' || lpad(nextval('public.patient_code_seq')::text, 6, '0')`,
      )
      .notNull(),
    fullName: text("full_name").notNull(),
    dateOfBirth: date("date_of_birth", { mode: "string" }).notNull(),
    gender: text("gender").notNull(),
    phone: text("phone"),
    backgroundDiagnosis: text("background_diagnosis"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => doctorProfiles.id),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    archivedAt: timestamp("archived_at", { withTimezone: true, mode: "string" }),
    archivedBy: uuid("archived_by").references(() => doctorProfiles.id),
  },
  (table) => [
    uniqueIndex("patients_patient_code_unique").on(table.patientCode),
    check(
      "patients_gender_check",
      sql`${table.gender} in ('male', 'female', 'other')`,
    ),
  ],
);

export type PatientRow = typeof patients.$inferSelect;
export type NewPatientRow = typeof patients.$inferInsert;
