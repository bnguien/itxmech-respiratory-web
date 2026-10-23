-- Phiếu đăng nhập in lại được: lưu mã truy cập dạng mã hóa AES-GCM (khóa suy ra từ APP_JWT_SECRET), vẫn giữ hash để kiểm tra.
ALTER TABLE "patient_app_access" ADD COLUMN "access_code_enc" text;--> statement-breakpoint
-- Lời dặn một chiều: bác sĩ viết trên web, app người nhà đọc qua GET /api/app/v1/notes.
CREATE TABLE "doctor_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"doctor_id" uuid,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "doctor_notes_content_check" CHECK (char_length("doctor_notes"."content") between 1 and 2000)
);--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "doctor_notes" ADD CONSTRAINT "doctor_notes_doctor_id_doctor_profiles_id_fk" FOREIGN KEY ("doctor_id") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "doctor_notes_patient_created_idx" ON "doctor_notes" USING btree ("patient_id","created_at");--> statement-breakpoint
ALTER TABLE public.doctor_notes ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.doctor_notes FROM anon, authenticated;
