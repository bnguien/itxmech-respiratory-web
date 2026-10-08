CREATE TABLE "recordings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"upload_status" text DEFAULT 'waiting_upload' NOT NULL,
	"mime_type" text DEFAULT 'audio/wav' NOT NULL,
	"file_size_bytes" bigint,
	"duration_ms" integer,
	"sample_rate_hz" integer,
	"bit_depth" integer,
	"channel_count" integer,
	"uploaded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recordings_upload_status_check" CHECK ("recordings"."upload_status" in ('waiting_upload', 'uploaded', 'failed'))
);--> statement-breakpoint
ALTER TABLE "recordings" ADD CONSTRAINT "recordings_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_visit_id_unique" ON "recordings" USING btree ("visit_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recordings_storage_path_unique" ON "recordings" USING btree ("storage_path");--> statement-breakpoint
CREATE INDEX "recordings_upload_status_idx" ON "recordings" USING btree ("upload_status");--> statement-breakpoint
CREATE INDEX "recordings_created_at_idx" ON "recordings" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.recordings FROM anon, authenticated;
