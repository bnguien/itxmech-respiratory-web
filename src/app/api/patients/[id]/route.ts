import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import {
  apiError,
  authorizeDoctor,
  serializePatient,
  validationError,
} from "@/lib/patients/server";
import { validatePatientInput } from "@/lib/patients/validation";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function patientById(id: string) {
  if (!uuidPattern.test(id)) return undefined;
  const [patient] = await db
    .select()
    .from(patients)
    .where(eq(patients.id, id))
    .limit(1);
  return patient;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  try {
    const patient = await patientById(id);
    if (!patient)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({ data: serializePatient(patient) });
  } catch (error) {
    console.error("Unable to get patient", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải hồ sơ bệnh nhân.");
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
      .returning();
    if (!updated)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({ data: serializePatient(updated) });
  } catch (error) {
    console.error("Unable to update patient", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Không thể cập nhật hồ sơ bệnh nhân.",
    );
  }
}
