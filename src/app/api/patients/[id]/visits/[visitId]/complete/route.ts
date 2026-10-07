import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  apiError,
  internalVisitError,
  jsonBodyError,
  validationError,
  visitStateError,
  visitVersionConflict,
} from "@/lib/visits/server";
import { uuidPattern, validateVisitVersion } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string; visitId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
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
    const [current] = await db
      .select({
        doctorId: visits.doctorId,
        status: visits.status,
        version: visits.version,
      })
      .from(visits)
      .where(and(eq(visits.id, visitId), eq(visits.patientId, id)))
      .limit(1);
    if (!current)
      return apiError(404, "NOT_FOUND", "Không tìm thấy lần khám.");
    if (current.doctorId !== auth.doctorId)
      return apiError(
        403,
        "FORBIDDEN",
        "Chỉ bác sĩ phụ trách mới được hoàn tất lần khám này.",
      );
    if (current.status !== "in_progress")
      return visitStateError(current.status);
    if (current.version !== validated.version) return visitVersionConflict();

    const now = new Date().toISOString();
    const [updated] = await db
      .update(visits)
      .set({
        status: "completed",
        completedAt: now,
        updatedAt: now,
        version: sql`${visits.version} + 1`,
      })
      .where(
        and(
          eq(visits.id, visitId),
          eq(visits.patientId, id),
          eq(visits.doctorId, auth.doctorId),
          eq(visits.status, "in_progress"),
          eq(visits.version, validated.version),
        ),
      )
      .returning({ version: visits.version, completedAt: visits.completedAt });
    if (!updated) return visitVersionConflict();
    return NextResponse.json({
      data: {
        status: "completed",
        version: updated.version,
        completed_at: updated.completedAt,
      },
    });
  } catch (error) {
    return internalVisitError("Failed to complete visit", error);
  }
}
