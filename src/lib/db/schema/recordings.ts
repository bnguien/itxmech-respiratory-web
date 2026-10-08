import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { visits } from "./visits";

export const recordings = pgTable(
  "recordings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id),
    storagePath: text("storage_path").notNull(),
    uploadStatus: text("upload_status").default("waiting_upload").notNull(),
    mimeType: text("mime_type").default("audio/wav").notNull(),
    fileSizeBytes: bigint("file_size_bytes", { mode: "number" }),
    durationMs: integer("duration_ms"),
    sampleRateHz: integer("sample_rate_hz"),
    bitDepth: integer("bit_depth"),
    channelCount: integer("channel_count"),
    uploadedAt: timestamp("uploaded_at", {
      withTimezone: true,
      mode: "string",
    }),
    analysisStatus: text("analysis_status").default("not_analyzed").notNull(),
    analysisStartedAt: timestamp("analysis_started_at", {
      withTimezone: true,
      mode: "string",
    }),
    analyzedAt: timestamp("analyzed_at", {
      withTimezone: true,
      mode: "string",
    }),
    analysisError: text("analysis_error"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "recordings_analysis_status_check",
      sql`${table.analysisStatus} in ('not_analyzed', 'analyzing', 'completed', 'failed')`,
    ),
    uniqueIndex("recordings_visit_id_unique").on(table.visitId),
    uniqueIndex("recordings_storage_path_unique").on(table.storagePath),
    check(
      "recordings_upload_status_check",
      sql`${table.uploadStatus} in ('waiting_upload', 'uploaded', 'failed')`,
    ),
    index("recordings_upload_status_idx").on(table.uploadStatus),
    index("recordings_created_at_idx").on(table.createdAt),
  ],
);

export type RecordingRow = typeof recordings.$inferSelect;
export type NewRecordingRow = typeof recordings.$inferInsert;
