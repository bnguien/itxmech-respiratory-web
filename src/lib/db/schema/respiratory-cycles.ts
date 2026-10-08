import { sql } from "drizzle-orm";
import {
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { recordings } from "./recordings";
import type { CycleLabel, CycleProbabilities } from "@/types/analysis";

export const respiratoryCycles = pgTable(
  "respiratory_cycles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    recordingId: uuid("recording_id")
      .notNull()
      .references(() => recordings.id, { onDelete: "cascade" }),
    cycleIndex: integer("cycle_index").notNull(),
    startSeconds: doublePrecision("start_seconds").notNull(),
    endSeconds: doublePrecision("end_seconds").notNull(),
    durationSeconds: doublePrecision("duration_seconds").notNull(),
    aiLabel: text("ai_label").$type<CycleLabel>(),
    aiConfidence: doublePrecision("ai_confidence"),
    aiProbabilities: jsonb("ai_probabilities").$type<CycleProbabilities>(),
    aiStatus: text("ai_status")
      .$type<"processed" | "unprocessable">()
      .notNull(),
    aiReason: text("ai_reason"),
    aiNFrames: integer("ai_n_frames"),
    doctorLabel: text("doctor_label").$type<CycleLabel>(),
    reviewStatus: text("review_status")
      .$type<"pending" | "confirmed" | "corrected">()
      .default("pending")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("respiratory_cycles_recording_index_unique").on(
      t.recordingId,
      t.cycleIndex,
    ),
    check(
      "respiratory_cycles_timing_check",
      sql`${t.cycleIndex} >= 0 and ${t.startSeconds} >= 0 and ${t.endSeconds} > ${t.startSeconds} and ${t.durationSeconds} > 0`,
    ),
    check(
      "respiratory_cycles_ai_status_check",
      sql`${t.aiStatus} in ('processed', 'unprocessable')`,
    ),
    check(
      "respiratory_cycles_review_status_check",
      sql`${t.reviewStatus} in ('pending', 'confirmed', 'corrected')`,
    ),
    check(
      "respiratory_cycles_ai_label_check",
      sql`${t.aiLabel} in ('normal', 'crackle', 'wheeze', 'both')`,
    ),
    check(
      "respiratory_cycles_doctor_label_check",
      sql`${t.doctorLabel} in ('normal', 'crackle', 'wheeze', 'both')`,
    ),
    check(
      "respiratory_cycles_confidence_check",
      sql`${t.aiConfidence} between 0 and 1`,
    ),
    check("respiratory_cycles_frames_check", sql`${t.aiNFrames} >= 0`),
  ],
);
