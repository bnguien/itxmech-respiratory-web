import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";
import { patients } from "@/lib/db/schema/patients";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  apiError,
  internalVisitError,
  jsonBodyError,
  serializeVisit,
  validationError,
  visitDetailSelection,
  visitStateError,
  visitVersionConflict,
} from "@/lib/visits/server";
import {
  uuidPattern,
  validateVisitUpdate,
  validateVisitVersion,
} from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string; visitId: string }> };

async function findVisit(patientId: string, visitId: string) {
  const [row] = await db
    .select(visitDetailSelection)
    .from(visits)
    .innerJoin(patients, eq(visits.patientId, patients.id))
    .innerJoin(doctorProfiles, eq(visits.doctorId, doctorProfiles.id))
    .where(and(eq(visits.id, visitId), eq(visits.patientId, patientId)))
    .limit(1);
  return row;
}

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id, visitId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(visitId))
    return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
  try {
    const row = await findVisit(id, visitId);
    if (!row)
      return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
    return NextResponse.json({ data: serializeVisit(row, auth.doctorId) });
  } catch (error) {
    return internalVisitError("Failed to get visit", error);
  }
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id, visitId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(visitId))
    return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonBodyError();
  }
  const validated = validateVisitUpdate(body);
  if (!validated.data) return validationError(validated.issues);

  try {
    const current = await findVisit(id, visitId);
    if (!current)
      return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
    if (current.doctorId !== auth.doctorId)
      return apiError(
        403,
        "FORBIDDEN",
        "Chỉ bác sĩ phụ trách mới được chỉnh sửa lần khám này.",
      );
    if (current.status !== "in_progress")
      return visitStateError(current.status);
    if (current.version !== validated.data.version)
      return visitVersionConflict();

    const [updated] = await db
      .update(visits)
      .set({
        clinicalNote: validated.data.clinical_note.trim() || null,
        version: sql`${visits.version} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(visits.id, visitId),
          eq(visits.patientId, id),
          eq(visits.doctorId, auth.doctorId),
          eq(visits.status, "in_progress"),
          eq(visits.version, validated.data.version),
        ),
      )
      .returning({ id: visits.id });
    if (!updated) return visitVersionConflict();
    const row = await findVisit(id, visitId);
    return NextResponse.json({ data: serializeVisit(row, auth.doctorId) });
  } catch (error) {
    return internalVisitError("Failed to update visit", error);
  }
}

export async function DELETE(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id, visitId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(visitId))
    return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonBodyError();
  }
  const validated = validateVisitVersion(body);
  if (validated.version === undefined)
    return validationError(validated.issues);

  try {
    const current = await findVisit(id, visitId);
    if (!current)
      return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
    if (current.doctorId !== auth.doctorId)
      return apiError(
        403,
        "FORBIDDEN",
        "Chỉ bác sĩ phụ trách mới được xóa lần khám này.",
      );
    if (current.status !== "cancelled")
      return apiError(
        409,
        "INVALID_VISIT_STATE",
        "Chỉ lần khám đã hủy mới được phép xóa.",
      );
    if (current.version !== validated.version) return visitVersionConflict();

    const [deleted] = await db
      .delete(visits)
      .where(
        and(
          eq(visits.id, visitId),
          eq(visits.patientId, id),
          eq(visits.doctorId, auth.doctorId),
          eq(visits.status, "cancelled"),
          eq(visits.version, validated.version),
        ),
      )
      .returning({ id: visits.id });
    if (!deleted) return visitVersionConflict();
    return NextResponse.json({ success: true });
  } catch (error) {
    return internalVisitError("Failed to delete cancelled visit", error);
  }
}
