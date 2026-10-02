import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import {
  apiError,
  authorizeDoctor,
  logPatientApiTiming,
  patientDetailSelection,
  serializePatientDetail,
  validationError,
  withPatientApiTiming,
} from "@/lib/patients/server";
import { validatePatientInput } from "@/lib/patients/validation";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function patientById(id: string) {
  if (!uuidPattern.test(id)) return undefined;
  const [patient] = await db
    .select(patientDetailSelection)
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);
  return patient;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const requestStartedAt = performance.now();
  const auth = await authorizeDoctor();
  const finish = (response: NextResponse, databaseMs = 0) => {
    const totalMs = performance.now() - requestStartedAt;
    logPatientApiTiming({
      route: "GET /api/patients/[id]",
      status: response.status,
      authorization: auth.timing,
      databaseMs,
      totalMs,
    });
    return withPatientApiTiming(response, auth.timing, databaseMs, totalMs);
  };
  if (auth.response) return finish(auth.response);
  const { id } = await params;
  const databaseStartedAt = performance.now();
  try {
    const patient = await patientById(id);
    const databaseMs = performance.now() - databaseStartedAt;
    if (!patient)
      return finish(
        apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân."),
        databaseMs,
      );
    return finish(
      NextResponse.json({ data: serializePatientDetail(patient) }),
      databaseMs,
    );
  } catch (error) {
    const databaseMs = performance.now() - databaseStartedAt;
    const databaseCode =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "UNKNOWN";
    console.error("[Patient API] Failed to get patient detail", {
      code: databaseCode,
    });
    return finish(
      apiError(500, "INTERNAL_ERROR", "Không thể tải hồ sơ bệnh nhân."),
      databaseMs,
    );
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id))
    return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([
      { field: "body", message: "Dữ liệu JSON không hợp lệ." },
    ]);
  }
  const result = validatePatientInput(body, true);
  if (!result.data) return validationError(result.issues);

  const values: Partial<typeof patients.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (result.data.full_name !== undefined)
    values.fullName = result.data.full_name;
  if (result.data.date_of_birth !== undefined)
    values.dateOfBirth = result.data.date_of_birth;
  if (result.data.gender !== undefined) values.gender = result.data.gender;
  if ("phone" in result.data) values.phone = result.data.phone ?? null;
  if ("background_diagnosis" in result.data)
    values.backgroundDiagnosis = result.data.background_diagnosis ?? null;

  try {
    const [updated] = await db
      .update(patients)
      .set(values)
      .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
      .returning(patientDetailSelection);
    if (!updated)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({ data: serializePatientDetail(updated) });
  } catch (error) {
    console.error("Unable to update patient", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Không thể cập nhật hồ sơ bệnh nhân.",
    );
  }
}
