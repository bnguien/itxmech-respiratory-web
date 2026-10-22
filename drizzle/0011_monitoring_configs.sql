-- Ngưỡng theo dõi SpO₂ do bác sĩ đặt, mỗi lần sửa một version. Chỉ ghi/đọc qua API server.
CREATE TABLE "monitoring_configs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"preset" text,
	"threshold_t" smallint NOT NULL,
	"crit_t" smallint NOT NULL,
	"crit_n_min" smallint NOT NULL,
	"crit_sqi" real NOT NULL,
	"hr_low" smallint NOT NULL,
	"hr_high" smallint NOT NULL,
	"ml_enabled" boolean NOT NULL,
	"watch_k" smallint NOT NULL,
	"watch_n" smallint NOT NULL,
	"watch_cooldown" smallint NOT NULL,
	"alert_k" smallint NOT NULL,
	"alert_n" smallint NOT NULL,
	"alert_cooldown" smallint NOT NULL,
	"crit_cooldown" smallint NOT NULL,
	"upload_interval_min" smallint NOT NULL,
	"note" text,
	"set_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "monitoring_configs_version_check" CHECK ("monitoring_configs"."version" >= 1),
	CONSTRAINT "monitoring_configs_t_check" CHECK ("monitoring_configs"."threshold_t" between 85 and 95)
);--> statement-breakpoint
ALTER TABLE "monitoring_configs" ADD CONSTRAINT "monitoring_configs_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_configs" ADD CONSTRAINT "monitoring_configs_set_by_doctor_profiles_id_fk" FOREIGN KEY ("set_by") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "monitoring_configs_patient_version_unique" ON "monitoring_configs" USING btree ("patient_id","version");--> statement-breakpoint
ALTER TABLE public.monitoring_configs ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.monitoring_configs FROM anon, authenticated;
