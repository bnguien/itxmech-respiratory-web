-- App người nhà: mã truy cập + phiên đăng nhập. Vòng đeo SpO₂: thiết bị, gán bệnh nhân, bản ghi phút, assessment.
-- Mọi ghi đều qua API server (/api/app/v1, /api/patients). Bác sĩ chỉ được SELECT dữ liệu vòng để nhận Realtime.
CREATE TABLE "patient_app_access" (
	"patient_id" uuid PRIMARY KEY NOT NULL,
	"access_code_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"rotated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "patient_app_access_failed_attempts_check" CHECK ("patient_app_access"."failed_attempts" >= 0)
);--> statement-breakpoint
ALTER TABLE "patient_app_access" ADD CONSTRAINT "patient_app_access_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "app_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"viewer_name" text NOT NULL,
	"role" text NOT NULL,
	"is_ble_gateway" boolean DEFAULT false NOT NULL,
	"fcm_token" text,
	"app_install_id" text,
	"refresh_token_hash" text NOT NULL,
	"refresh_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "app_sessions_role_check" CHECK ("app_sessions"."role" in ('family', 'patient', 'doctor'))
);--> statement-breakpoint
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_sessions_patient_id_idx" ON "app_sessions" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX "app_sessions_refresh_token_hash_idx" ON "app_sessions" USING btree ("refresh_token_hash");--> statement-breakpoint
CREATE TABLE "wearable_devices" (
	"device_id" text PRIMARY KEY NOT NULL,
	"device_key_hash" text,
	"battery_pct" smallint,
	"worn" boolean,
	"last_seen_at" timestamp with time zone,
	"transport" text,
	"fw" text,
	"model_version" text,
	"boot_id" integer,
	"backlog" integer,
	"last_seq" bigint,
	"applied_config_version" integer DEFAULT 0 NOT NULL,
	"config_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "device_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"device_id" text NOT NULL,
	"patient_id" uuid NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);--> statement-breakpoint
ALTER TABLE "device_assignments" ADD CONSTRAINT "device_assignments_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_assignments" ADD CONSTRAINT "device_assignments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "device_assignments_open_device_unique" ON "device_assignments" USING btree ("device_id") WHERE "device_assignments"."unassigned_at" is null;--> statement-breakpoint
CREATE INDEX "device_assignments_patient_id_idx" ON "device_assignments" USING btree ("patient_id");--> statement-breakpoint
CREATE TABLE "vitals_minute" (
	"device_id" text NOT NULL,
	"seq" bigint NOT NULL,
	"patient_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"spo2_mean" real,
	"spo2_min" real,
	"spo2_valid" real NOT NULL,
	"pulse_mean" real,
	"sqi" real,
	"worn" boolean,
	"transport" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vitals_minute_device_id_seq_pk" PRIMARY KEY("device_id","seq"),
	CONSTRAINT "vitals_minute_transport_check" CHECK ("vitals_minute"."transport" in ('ble_relay', 'wifi'))
);--> statement-breakpoint
ALTER TABLE "vitals_minute" ADD CONSTRAINT "vitals_minute_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals_minute" ADD CONSTRAINT "vitals_minute_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "vitals_minute_patient_ts_idx" ON "vitals_minute" USING btree ("patient_id","ts");--> statement-breakpoint
CREATE TABLE "assessments" (
	"device_id" text NOT NULL,
	"seq" bigint NOT NULL,
	"patient_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"level" text NOT NULL,
	"trigger" text NOT NULL,
	"notify" jsonb NOT NULL,
	"ran_model" boolean NOT NULL,
	"out_q" smallint,
	"threshold_t" smallint NOT NULL,
	"spo2_now" real,
	"pulse_now" real,
	"reasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"local_notified" boolean DEFAULT false NOT NULL,
	"config_version" integer NOT NULL,
	"model_version" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_device_id_seq_pk" PRIMARY KEY("device_id","seq"),
	CONSTRAINT "assessments_level_check" CHECK ("assessments"."level" in ('UNKNOWN', 'NORMAL', 'WATCH', 'ALERT', 'CRITICAL'))
);--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "assessments_patient_ts_idx" ON "assessments" USING btree ("patient_id","ts");--> statement-breakpoint
-- Không ai đọc trực tiếp mã truy cập / phiên qua Supabase client.
ALTER TABLE public.patient_app_access ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.patient_app_access FROM anon, authenticated;--> statement-breakpoint
ALTER TABLE public.app_sessions ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.app_sessions FROM anon, authenticated;--> statement-breakpoint
-- Dữ liệu vòng: bác sĩ đăng nhập chỉ SELECT (để nhận Realtime), ghi qua API.
ALTER TABLE public.wearable_devices ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.device_assignments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.vitals_minute ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.wearable_devices, public.device_assignments, public.vitals_minute, public.assessments FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.wearable_devices, public.device_assignments, public.vitals_minute, public.assessments TO authenticated;--> statement-breakpoint
CREATE POLICY "Doctors can read wearable devices" ON public.wearable_devices FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
CREATE POLICY "Doctors can read device assignments" ON public.device_assignments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
CREATE POLICY "Doctors can read vitals" ON public.vitals_minute FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
CREATE POLICY "Doctors can read assessments" ON public.assessments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['vitals_minute', 'assessments', 'wearable_devices'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
