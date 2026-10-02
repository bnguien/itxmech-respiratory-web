import { and, count, desc, ilike, isNull, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import {
  apiError,
  authorizeDoctor,
  logPatientApiTiming,
  patientDetailSelection,
  patientListSelection,
  serializePatientDetail,
  serializePatientListItem,
  validationError,
  withPatientApiTiming,
} from "@/lib/patients/server";
import { validatePatientInput } from "@/lib/patients/validation";

export async function GET(request: NextRequest) {
  const requestStartedAt = performance.now();
  const auth = await authorizeDoctor();
  const finish = (response: NextResponse, databaseMs = 0) => {
    const totalMs = performance.now() - requestStartedAt;
    logPatientApiTiming({
      route: "GET /api/patients",
      status: response.status,
      authorization: auth.timing,
      databaseMs,
      totalMs,
    });
    return withPatientApiTiming(response, auth.timing, databaseMs, totalMs);
  };
  if (auth.response) return finish(auth.response);

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const rawPage = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  if (
    !Number.isInteger(rawPage) ||
    rawPage < 1 ||
    !Number.isInteger(rawLimit) ||
    rawLimit < 1 ||
    rawLimit > 100
  ) {
    return finish(validationError([
      {
        field: "pagination",
        message: "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
      },
    ]));
  }

  const search = q
    ? or(
        ilike(patients.fullName, `%${q}%`),
        ilike(patients.patientCode, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
      )
    : undefined;
  const where = and(isNull(patients.archivedAt), search);

  const databaseStartedAt = performance.now();
  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select(patientListSelection)
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt), desc(patients.patientCode))
        .limit(rawLimit)
        .offset((rawPage - 1) * rawLimit),
      db.select({ value: count() }).from(patients).where(where),
    ]);
    const databaseMs = performance.now() - databaseStartedAt;
    const total = totalRows[0]?.value ?? 0;
    return finish(NextResponse.json({
      data: rows.map(serializePatientListItem),
      pagination: {
        page: rawPage,
        limit: rawLimit,
        total,
        total_pages: Math.ceil(total / rawLimit),
      },
    }), databaseMs);
  } catch (error) {
    const databaseMs = performance.now() - databaseStartedAt;
    const databaseCode =
      typeof (error as { code?: unknown }).code === "string"
        ? (error as { code: string }).code
        : "UNKNOWN";
    console.error("[Patient API] Failed to list active patients", {
      code: databaseCode,
    });
    return finish(
      apiError(500, "INTERNAL_ERROR", "Không thể tải danh sách bệnh nhân."),
      databaseMs,
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationError([
      { field: "body", message: "Dữ liệu JSON không hợp lệ." },
    ]);
  }
  const result = validatePatientInput(body);
  if (!result.data) return validationError(result.issues);

  try {
    const [created] = await db
      .insert(patients)
      .values({
        fullName: result.data.full_name!,
        dateOfBirth: result.data.date_of_birth!,
        gender: result.data.gender!,
        phone: result.data.phone ?? null,
        backgroundDiagnosis: result.data.background_diagnosis ?? null,
        createdBy: auth.doctorId,
      })
      .returning(patientDetailSelection);
    return NextResponse.json(
      { data: serializePatientDetail(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create patient", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tạo hồ sơ bệnh nhân.");
  }
}
