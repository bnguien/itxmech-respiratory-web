import { and, count, desc, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";
import { patients } from "@/lib/db/schema/patients";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  apiError,
  internalVisitError,
  serializeVisit,
  serializeVisitSummary,
  validationError,
  visitDetailSelection,
  visitSummarySelection,
} from "@/lib/visits/server";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id))
    return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

  try {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
      .limit(1);
    if (!patient)
      return apiError(
        404,
        "NOT_FOUND",
        "Không tìm thấy bệnh nhân đang hoạt động.",
      );

    const [created] = await db
      .insert(visits)
      .values({ patientId: id, doctorId: auth.doctorId })
      .returning({ id: visits.id });
    const [row] = await db
      .select(visitDetailSelection)
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .innerJoin(doctorProfiles, eq(visits.doctorId, doctorProfiles.id))
      .where(eq(visits.id, created.id))
      .limit(1);

    return NextResponse.json(
      { data: serializeVisit(row, auth.doctorId) },
      { status: 201 },
    );
  } catch (error) {
    return internalVisitError("Failed to create visit", error);
  }
}

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id))
    return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return validationError([
      {
        field: "pagination",
        message: "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
      },
    ]);

  try {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, id))
      .limit(1);
    if (!patient)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

    const [rows, totalRows] = await Promise.all([
      db
        .select(visitSummarySelection)
        .from(visits)
        .innerJoin(doctorProfiles, eq(visits.doctorId, doctorProfiles.id))
        .where(eq(visits.patientId, id))
        .orderBy(desc(visits.startedAt), desc(visits.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(visits).where(eq(visits.patientId, id)),
    ]);
    const total = totalRows[0]?.value ?? 0;
    return NextResponse.json({
      data: rows.map((row) => serializeVisitSummary(row, auth.doctorId)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return internalVisitError("Failed to list visits", error);
  }
}
