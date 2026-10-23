import { and, count, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions, patientAppAccess } from "@/lib/db/schema/app-access";
import { patients } from "@/lib/db/schema/patients";
import { readAppAccessCode, rotateAppAccessCode } from "@/lib/app-api/server";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findActivePatient(id: string) {
  const [patient] = await db
    .select({ id: patients.id, patientCode: patients.patientCode, fullName: patients.fullName })
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
    .limit(1);
  return patient ?? null;
}

/**
 * Phiếu đăng nhập app người nhà: mã bệnh nhân, mã truy cập hiện tại (giải mã để xem / in lại), lúc cấp,
 * số máy đang đăng nhập. `access_code` null khi mã được cấp trước khi có bản mã hóa: cấp mã mới để in phiếu.
 */
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  try {
    const patient = await findActivePatient(id);
    if (!patient) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    const [[access], [sessions], accessCode] = await Promise.all([
      db
        .select({ rotatedAt: patientAppAccess.rotatedAt, revokedAt: patientAppAccess.revokedAt })
        .from(patientAppAccess)
        .where(eq(patientAppAccess.patientId, id))
        .limit(1),
      db
        .select({ value: count() })
        .from(appSessions)
        .where(and(eq(appSessions.patientId, id), isNull(appSessions.revokedAt))),
      readAppAccessCode(id),
    ]);
    return NextResponse.json({
      data: {
        patient_code: patient.patientCode,
        full_name: patient.fullName,
        access_code: accessCode,
        has_access_code: !!access && !access.revokedAt,
        rotated_at: access?.rotatedAt ?? null,
        active_sessions: sessions?.value ?? 0,
      },
    });
  } catch (error) {
    console.error("Unable to read app access", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải thông tin đăng nhập app.");
  }
}

/** Cấp mã truy cập mới: mã cũ không dùng để đăng nhập mới được nữa, các máy đang đăng nhập vẫn giữ phiên. */
export async function POST(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  try {
    const patient = await findActivePatient(id);
    if (!patient) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    const accessCode = await rotateAppAccessCode(id);
    return NextResponse.json({ data: { patient_code: patient.patientCode, access_code: accessCode } });
  } catch (error) {
    console.error("Unable to rotate app access code", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể cấp mã truy cập mới.");
  }
}
