import "server-only";

import { NextResponse } from "next/server";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";
import { patients } from "@/lib/db/schema/patients";
import { visits } from "@/lib/db/schema/visits";
import { apiError, validationError } from "@/lib/patients/server";
import type { Visit, VisitStatus, VisitSummary } from "@/types/visit";

export { apiError, validationError };

export const visitDetailSelection = {
  id: visits.id,
  patientName: patients.fullName,
  patientCode: patients.patientCode,
  patientDateOfBirth: patients.dateOfBirth,
  patientGender: patients.gender,
  patientBackgroundDiagnosis: patients.backgroundDiagnosis,
  doctorId: visits.doctorId,
  doctorName: doctorProfiles.fullName,
  clinicalNote: visits.clinicalNote,
  status: visits.status,
  version: visits.version,
  startedAt: visits.startedAt,
  completedAt: visits.completedAt,
  updatedAt: visits.updatedAt,
};

export const visitSummarySelection = {
  id: visits.id,
  doctorId: visits.doctorId,
  doctorName: doctorProfiles.fullName,
  clinicalNote: visits.clinicalNote,
  status: visits.status,
  version: visits.version,
  startedAt: visits.startedAt,
  completedAt: visits.completedAt,
  updatedAt: visits.updatedAt,
};

type VisitDetailRow = {
  id: string;
  patientName: string;
  patientCode: string;
  patientDateOfBirth: string;
  patientGender: string;
  patientBackgroundDiagnosis: string | null;
  doctorId: string;
  doctorName: string;
  clinicalNote: string | null;
  status: string;
  version: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

export function serializeVisit(row: VisitDetailRow, doctorId: string): Visit {
  return {
    id: row.id,
    patient_name: row.patientName,
    patient_code: row.patientCode,
    patient_date_of_birth: row.patientDateOfBirth,
    patient_gender: row.patientGender as Visit["patient_gender"],
    patient_background_diagnosis: row.patientBackgroundDiagnosis,
    doctor_name: row.doctorName,
    clinical_note: row.clinicalNote,
    status: asVisitStatus(row.status),
    version: row.version,
    started_at: row.startedAt,
    completed_at: row.completedAt,
    updated_at: row.updatedAt,
    can_edit: row.doctorId === doctorId && row.status === "in_progress",
  };
}

export function serializeVisitSummary(row: {
  id: string;
  doctorId: string;
  doctorName: string;
  clinicalNote: string | null;
  status: string;
  version: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
}, doctorId: string): VisitSummary {
  return {
    id: row.id,
    doctor_name: row.doctorName,
    clinical_note: row.clinicalNote,
    status: asVisitStatus(row.status),
    version: row.version,
    started_at: row.startedAt,
    completed_at: row.completedAt,
    updated_at: row.updatedAt,
    can_edit: row.doctorId === doctorId && row.status === "in_progress",
    can_delete: row.doctorId === doctorId && row.status === "cancelled",
  };
}

export function visitStateError(status: string) {
  return apiError(
    409,
    "INVALID_VISIT_STATE",
    status === "completed"
      ? "Lần khám đã hoàn tất và chỉ có thể xem."
      : "Lần khám đã bị hủy và chỉ có thể xem.",
  );
}

export function visitVersionConflict() {
  return apiError(
    409,
    "VISIT_VERSION_CONFLICT",
    "Lần khám đã được thay đổi ở tab hoặc phiên khác. Vui lòng tải lại để xử lý xung đột.",
  );
}

export function jsonBodyError() {
  return validationError([
    { field: "body", message: "Dữ liệu JSON không hợp lệ." },
  ]);
}

export function asVisitStatus(value: string): VisitStatus {
  return value as VisitStatus;
}

export function internalVisitError(action: string, error: unknown) {
  const code =
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "UNKNOWN";
  console.error(`[Visit API] ${action}`, { code });
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Không thể xử lý lần khám. Vui lòng thử lại.",
      },
    },
    { status: 500 },
  );
}
