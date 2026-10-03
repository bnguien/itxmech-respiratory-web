CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid NOT NULL,
	"clinical_note" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "visits_status_check" CHECK ("visits"."status" in ('in_progress', 'completed', 'cancelled')),
	CONSTRAINT "visits_version_check" CHECK ("visits"."version" >= 1)
);--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "visits_patient_id_idx" ON "visits" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "visits_doctor_id_idx" ON "visits" USING btree ("doctor_id");--> statement-breakpoint
CREATE INDEX "visits_started_at_idx" ON "visits" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "visits_status_idx" ON "visits" USING btree ("status");--> statement-breakpoint
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.visits FROM anon, authenticated;
