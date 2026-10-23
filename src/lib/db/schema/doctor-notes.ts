import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { doctorProfiles } from "./doctor-profiles";
import { patients } from "./patients";

/** Lời dặn một chiều: bác sĩ viết trên web, app người nhà chỉ đọc. Xóa mềm để app tải lại không thấy nữa. */
export const doctorNotes = pgTable(
  "doctor_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => doctorProfiles.id),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("doctor_notes_patient_created_idx").on(table.patientId, table.createdAt),
    check("doctor_notes_content_check", sql`char_length(${table.content}) between 1 and 2000`),
  ],
);

export type DoctorNoteRow = typeof doctorNotes.$inferSelect;
