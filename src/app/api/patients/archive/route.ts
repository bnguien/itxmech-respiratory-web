import { and, count, desc, ilike, isNotNull, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import {
  apiError,
  authorizeDoctor,
  logPatientApiTiming,
  patientListSelection,
  serializePatientListItem,
  validationError,
  withPatientApiTiming,
} from "@/lib/patients/server";

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now();
  const auth = await authorizeDoctor();
  const finish = (response: NextResponse, databaseMs = 0) => {
    const totalMs = performance.now() - requestStartedAt;
    logPatientApiTiming({
      route: "GET /api/patients/archive",
      status: response.status,
      authorization: auth.timing,
      databaseMs,
      totalMs,
    });
    return withPatientApiTiming(response, auth.timing, databaseMs, totalMs);
  };
  if (auth.response) return finish(auth.response);
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return finish(validationError([
      {
        field: "pagination",
        message: "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
      },
    ]));
  const search = q
    ? or(
        ilike(patients.fullName, `%${q}%`),
        ilike(patients.patientCode, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
      )
    : undefined;
  const where = and(isNotNull(patients.archivedAt), search);
  const databaseStartedAt = performance.now();
  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select(patientListSelection)
        .from(patients)
        .where(where)
        .orderBy(desc(patients.archivedAt), desc(patients.patientCode))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(patients).where(where),
    ]);
    const databaseMs = performance.now() - databaseStartedAt;
    const total = totalRows[0]?.value ?? 0;
    return finish(NextResponse.json({
      data: rows.map(serializePatientListItem),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    }), databaseMs);
  } catch (error) {
    const databaseMs = performance.now() - databaseStartedAt;
    const databaseCode =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "UNKNOWN";
    console.error("[Patient API] Failed to list archived patients", {
      code: databaseCode,
    });
    return finish(
      apiError(
        500,
        "INTERNAL_ERROR",
        "Không thể tải danh sách bệnh nhân đã lưu trữ.",
      ),
      databaseMs,
    );
  }
}
