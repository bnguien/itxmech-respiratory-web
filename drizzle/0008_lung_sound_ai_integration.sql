ALTER TABLE "recordings" ADD COLUMN "analysis_status" text DEFAULT 'not_analyzed' NOT NULL,
  ADD COLUMN "analysis_started_at" timestamp with time zone,
  ADD COLUMN "analyzed_at" timestamp with time zone,
  ADD COLUMN "analysis_error" text,
  ADD CONSTRAINT "recordings_analysis_status_check" CHECK (analysis_status IN ('not_analyzed', 'analyzing', 'completed', 'failed'));
--> statement-breakpoint
CREATE TABLE "respiratory_cycles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "recording_id" uuid NOT NULL REFERENCES "recordings"("id") ON DELETE CASCADE,
  "cycle_index" integer NOT NULL,
  "start_seconds" double precision NOT NULL,
  "end_seconds" double precision NOT NULL,
  "duration_seconds" double precision NOT NULL,
  "ai_label" text,
  "ai_confidence" double precision,
  "ai_probabilities" jsonb,
  "ai_status" text NOT NULL,
  "ai_reason" text,
  "ai_n_frames" integer,
  "doctor_label" text,
  "review_status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "respiratory_cycles_timing_check" CHECK (cycle_index >= 0 AND start_seconds >= 0 AND end_seconds > start_seconds AND duration_seconds > 0),
  CONSTRAINT "respiratory_cycles_ai_status_check" CHECK (ai_status IN ('processed', 'unprocessable')),
  CONSTRAINT "respiratory_cycles_review_status_check" CHECK (review_status IN ('pending', 'confirmed', 'corrected')),
  CONSTRAINT "respiratory_cycles_ai_label_check" CHECK (ai_label IN ('normal', 'crackle', 'wheeze', 'both')),
  CONSTRAINT "respiratory_cycles_doctor_label_check" CHECK (doctor_label IN ('normal', 'crackle', 'wheeze', 'both')),
  CONSTRAINT "respiratory_cycles_confidence_check" CHECK (ai_confidence BETWEEN 0 AND 1),
  CONSTRAINT "respiratory_cycles_frames_check" CHECK (ai_n_frames >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "respiratory_cycles_recording_index_unique" ON "respiratory_cycles" ("recording_id", "cycle_index");
--> statement-breakpoint
ALTER TABLE "respiratory_cycles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON TABLE "respiratory_cycles" FROM anon, authenticated;
