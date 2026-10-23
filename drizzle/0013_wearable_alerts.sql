-- Cảnh báo ALERT / CRITICAL từ vòng: server tạo khi nhận ingest/assessments, bác sĩ xem trên web (Realtime), app nhận FCM.
CREATE TABLE "wearable_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"level" text NOT NULL,
	"trigger" text NOT NULL,
	"spo2" real,
	"pulse" real,
	"threshold_t" real,
	"transport" text,
	"source_seq" bigint NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"escalated_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"acknowledged_by" uuid,
	"family_acked_at" timestamp with time zone,
	"family_acked_by" text,
	"feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wearable_alerts_level_check" CHECK ("wearable_alerts"."level" in ('ALERT', 'CRITICAL'))
);--> statement-breakpoint
ALTER TABLE "wearable_alerts" ADD CONSTRAINT "wearable_alerts_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_alerts" ADD CONSTRAINT "wearable_alerts_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_alerts" ADD CONSTRAINT "wearable_alerts_acknowledged_by_doctor_profiles_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wearable_alerts_patient_opened_idx" ON "wearable_alerts" USING btree ("patient_id","opened_at");--> statement-breakpoint
CREATE INDEX "wearable_alerts_open_idx" ON "wearable_alerts" USING btree ("opened_at") WHERE "wearable_alerts"."acknowledged_at" is null;--> statement-breakpoint
-- Bác sĩ đăng nhập chỉ SELECT (để nhận Realtime); ghi qua API.
ALTER TABLE public.wearable_alerts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.wearable_alerts FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.wearable_alerts TO authenticated;--> statement-breakpoint
CREATE POLICY "Doctors can read wearable alerts" ON public.wearable_alerts FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wearable_alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wearable_alerts;
  END IF;
END $$;
