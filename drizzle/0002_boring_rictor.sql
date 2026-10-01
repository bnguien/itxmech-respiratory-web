CREATE SEQUENCE "public"."patient_code_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "patients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_code" text DEFAULT 'PAT-' || lpad(nextval('public.patient_code_seq')::text, 6, '0') NOT NULL,
	"full_name" text NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" text NOT NULL,
	"phone" text,
	"background_diagnosis" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_by" uuid,
	CONSTRAINT "patients_gender_check" CHECK ("gender" IN ('male', 'female', 'other'))
);
--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_created_by_doctor_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_deleted_by_doctor_profiles_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."doctor_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patients_patient_code_unique" ON "patients" USING btree ("patient_code");--> statement-breakpoint
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.patients TO authenticated;--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE public.patient_code_seq TO authenticated;--> statement-breakpoint
CREATE POLICY "Authenticated doctors can read patients"
ON public.patients FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));--> statement-breakpoint
CREATE POLICY "Authenticated doctors can create patients"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid()))
);--> statement-breakpoint
CREATE POLICY "Authenticated doctors can update patients"
ON public.patients FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())))
WITH CHECK (EXISTS (SELECT 1 FROM public.doctor_profiles WHERE id = (SELECT auth.uid())));
