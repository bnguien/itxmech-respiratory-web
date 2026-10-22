import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";
import { patients } from "@/lib/db/schema/patients";
import { appError } from "@/lib/app-api/http";
import { authorizeApp, currentDeviceOf } from "@/lib/app-api/server";

/** Hồ sơ bệnh nhân cho thẻ trên app. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;

  const [row] = await db
    .select({
      patientCode: patients.patientCode,
      fullName: patients.fullName,
      gender: patients.gender,
      dateOfBirth: patients.dateOfBirth,
      backgroundDiagnosis: patients.backgroundDiagnosis,
      doctorName: doctorProfiles.fullName,
    })
    .from(patients)
    .leftJoin(doctorProfiles, eq(doctorProfiles.id, patients.createdBy))
    .where(eq(patients.id, auth.patientId))
    .limit(1);
  if (!row) return appError(404, "NOT_FOUND", "Không tìm thấy hồ sơ bệnh nhân.");

  const device = await currentDeviceOf(auth.patientId);
  return NextResponse.json({
    patient: {
      patient_code: row.patientCode,
      full_name: row.fullName,
      gender: row.gender,
      date_of_birth: row.dateOfBirth,
      background_diagnosis: row.backgroundDiagnosis,
      next_appointment_at: null,
    },
    doctor: row.doctorName ? { full_name: row.doctorName } : null,
    device: device
      ? { device_id: device.deviceId, battery_pct: device.batteryPct, last_seen_at: device.lastSeenAt }
      : null,
  });
}
