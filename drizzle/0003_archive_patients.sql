ALTER TABLE "patients" RENAME COLUMN "deleted_at" TO "archived_at";--> statement-breakpoint
ALTER TABLE "patients" RENAME COLUMN "deleted_by" TO "archived_by";--> statement-breakpoint
ALTER TABLE "patients" RENAME CONSTRAINT "patients_deleted_by_doctor_profiles_id_fk" TO "patients_archived_by_doctor_profiles_id_fk";
