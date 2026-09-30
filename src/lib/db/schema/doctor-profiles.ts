import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const doctorProfiles = pgTable("doctor_profiles", {
  id: uuid("id").primaryKey(),
  fullName: text("full_name").notNull(),
  professionalTitle: text("professional_title"),
  specialty: text("specialty"),
  department: text("department"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .defaultNow()
    .notNull(),
});

export type DoctorProfileRow = typeof doctorProfiles.$inferSelect;
export type NewDoctorProfileRow = typeof doctorProfiles.$inferInsert;
