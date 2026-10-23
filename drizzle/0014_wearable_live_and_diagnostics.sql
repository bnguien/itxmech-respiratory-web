-- Số hiển thị 15 giây (LIVE v2) và số liệu hiệu năng (DIAG) của vòng đeo.
-- wearable_live: MỘT dòng mỗi vòng, ghi đè mỗi 15 giây (app gateway chuyển tiếp) để app người nhà và web
-- thấy cùng số với máy đang nối vòng. Không lưu lịch sử: lịch sử vẫn là vitals_minute.
CREATE TABLE "wearable_live" (
	"device_id" text PRIMARY KEY NOT NULL,
	"patient_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"spo2" real,
	"spo2_min" real,
	"pulse" real,
	"sqi" real,
	"valid" real NOT NULL,
	"worn" boolean NOT NULL,
	"transport" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wearable_live_transport_check" CHECK ("wearable_live"."transport" in ('ble_relay', 'wifi'))
);--> statement-breakpoint
ALTER TABLE "wearable_live" ADD CONSTRAINT "wearable_live_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wearable_live" ADD CONSTRAINT "wearable_live_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wearable_live_patient_id_idx" ON "wearable_live" USING btree ("patient_id");--> statement-breakpoint
-- DIAG: mỗi cửa sổ 5 phút một dòng. Khóa (device_id, boot_id, uptime_s): gửi lại (BLE lẫn WiFi) không trùng.
CREATE TABLE "device_diagnostics" (
	"device_id" text NOT NULL,
	"boot_id" integer NOT NULL,
	"uptime_s" bigint NOT NULL,
	"patient_id" uuid NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"cpu_avg_pct" real,
	"cpu_peak_pct" real,
	"model_ms" real,
	"minute_ms" real,
	"flash_ms" real,
	"heap_min_kb" smallint,
	"wifi_s" smallint,
	"reset_reason" text NOT NULL,
	"ble_drops" smallint,
	"transport" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "device_diagnostics_pk" PRIMARY KEY("device_id","boot_id","uptime_s"),
	CONSTRAINT "device_diagnostics_transport_check" CHECK ("device_diagnostics"."transport" in ('ble_relay', 'wifi'))
);--> statement-breakpoint
ALTER TABLE "device_diagnostics" ADD CONSTRAINT "device_diagnostics_device_id_wearable_devices_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."wearable_devices"("device_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_diagnostics" ADD CONSTRAINT "device_diagnostics_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "device_diagnostics_device_ts_idx" ON "device_diagnostics" USING btree ("device_id","ts");--> statement-breakpoint
-- Bác sĩ đăng nhập chỉ SELECT (để nhận Realtime); ghi qua API.
ALTER TABLE public.wearable_live ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE public.device_diagnostics ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.wearable_live, public.device_diagnostics FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT ON TABLE public.wearable_live, public.device_diagnostics TO authenticated;--> statement-breakpoint
CREATE POLICY "Doctors can read wearable live" ON public.wearable_live FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
CREATE POLICY "Doctors can read device diagnostics" ON public.device_diagnostics FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wearable_live'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wearable_live;
  END IF;
END $$;
