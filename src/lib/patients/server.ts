import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { PatientRow } from "@/lib/db/schema/patients";
import type { PatientRecord } from "@/types/patient";

export type DoctorAuthorization =
  | { doctorId: string; response?: never }
  | { doctorId?: never; response: NextResponse };

export async function authorizeDoctor(): Promise<DoctorAuthorization> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Bạn chưa đăng nhập." } },
        { status: 401 },
      ),
    };
  }

  const { data: profile } = await supabase
    .from("doctor_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      response: NextResponse.json(
        {
          error: {
            code: "FORBIDDEN",
            message: "Tài khoản chưa có hồ sơ bác sĩ.",
          },
        },
        { status: 403 },
      ),
    };
  }

  return { doctorId: profile.id };
}

export function serializePatient(row: PatientRow): PatientRecord {
  return {
    id: row.id,
    patient_code: row.patientCode,
    full_name: row.fullName,
    date_of_birth: row.dateOfBirth,
    gender: row.gender as PatientRecord["gender"],
    phone: row.phone,
    background_diagnosis: row.backgroundDiagnosis,
    created_by: row.createdBy,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    archived_at: row.archivedAt,
    archived_by: row.archivedBy,
  };
}

export function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function validationError(
  details: Array<{ field: string; message: string }>,
) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu gửi lên không hợp lệ.",
        details,
      },
    },
    { status: 400 },
  );
}
