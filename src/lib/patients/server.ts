import "server-only";

import { NextResponse } from "next/server";
import { patients } from "@/lib/db/schema/patients";
import { createClient } from "@/lib/supabase/server";
import type { PatientRow } from "@/lib/db/schema/patients";
import type { PatientDetailRecord, PatientListItem } from "@/types/patient";

export interface AuthorizationTiming {
  supabaseAuthMs: number;
  totalMs: number;
}

export type DoctorAuthorization =
  | { doctorId: string; response?: never; timing: AuthorizationTiming }
  | { doctorId?: never; response: NextResponse; timing: AuthorizationTiming };

const roundMs = (value: number) => Math.round(value * 10) / 10;

export const patientListSelection = {
  id: patients.id,
  patientCode: patients.patientCode,
  fullName: patients.fullName,
  dateOfBirth: patients.dateOfBirth,
  gender: patients.gender,
  phone: patients.phone,
  backgroundDiagnosis: patients.backgroundDiagnosis,
};

export const patientDetailSelection = {
  ...patientListSelection,
  archivedAt: patients.archivedAt,
};

export function logPatientApiTiming(input: {
  route: string;
  status: number;
  authorization: AuthorizationTiming;
  databaseMs: number;
  totalMs: number;
}) {
  console.info("[Patient API timing]", {
    route: input.route,
    status: input.status,
    auth_ms: roundMs(input.authorization.supabaseAuthMs),
    database_ms: roundMs(input.databaseMs),
    total_ms: roundMs(input.totalMs),
  });
}

export function withPatientApiTiming(
  response: NextResponse,
  authorization: AuthorizationTiming,
  databaseMs: number,
  totalMs: number,
) {
  response.headers.set(
    "Server-Timing",
    [
      `auth;dur=${roundMs(authorization.supabaseAuthMs)}`,
      `db;dur=${roundMs(databaseMs)}`,
      `total;dur=${roundMs(totalMs)}`,
    ].join(", "),
  );
  return response;
}

export async function authorizeDoctor(): Promise<DoctorAuthorization> {
  const startedAt = performance.now();
  const authStartedAt = performance.now();
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const supabaseAuthMs = performance.now() - authStartedAt;
  const timing = {
    supabaseAuthMs,
    totalMs: performance.now() - startedAt,
  };

  if (error || !user) {
    return {
      response: NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Bạn chưa đăng nhập." } },
        { status: 401 },
      ),
      timing,
    };
  }

  return { doctorId: user.id, timing };
}

type PatientListRow = Pick<
  PatientRow,
  | "id"
  | "patientCode"
  | "fullName"
  | "dateOfBirth"
  | "gender"
  | "phone"
  | "backgroundDiagnosis"
>;

type PatientDetailRow = PatientListRow & Pick<PatientRow, "archivedAt">;

export function serializePatientListItem(row: PatientListRow): PatientListItem {
  return {
    id: row.id,
    patient_code: row.patientCode,
    full_name: row.fullName,
    date_of_birth: row.dateOfBirth,
    gender: row.gender as PatientListItem["gender"],
    phone: row.phone,
    background_diagnosis: row.backgroundDiagnosis,
  };
}

export function serializePatientDetail(
  row: PatientDetailRow,
): PatientDetailRecord {
  return {
    ...serializePatientListItem(row),
    archived_at: row.archivedAt,
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
