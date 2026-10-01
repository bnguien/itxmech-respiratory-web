import { and, count, desc, ilike, isNull, or } from "drizzle-orm";
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

function patientListDatabaseError(error: unknown) {
  const databaseError = error as {
    message?: unknown;
    code?: unknown;
    detail?: unknown;
    hint?: unknown;
  };
  const debug = {
    message:
      typeof databaseError.message === "string"
        ? databaseError.message
        : String(error),
    code:
      typeof databaseError.code === "string" ? databaseError.code : undefined,
    detail:
      typeof databaseError.detail === "string"
        ? databaseError.detail
        : undefined,
    hint:
      typeof databaseError.hint === "string" ? databaseError.hint : undefined,
  };
  console.error(
    "[Patients API] Database error while listing active patients",
    debug,
  );
  return NextResponse.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "Không thể tải danh sách bệnh nhân.",
        ...(process.env.NODE_ENV !== "production" ? { debug } : {}),
      },
    },
    { status: 500 },
  );
}

export async function GET(request: NextRequest) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;

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
    return validationError([
      {
        field: "pagination",
        message: "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
      },
    ]);
  }

  const search = q
    ? or(
        ilike(patients.fullName, `%${q}%`),
        ilike(patients.patientCode, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
      )
    : undefined;
  const where = and(isNull(patients.archivedAt), search);

  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(patients)
        .where(where)
        .orderBy(desc(patients.createdAt), desc(patients.patientCode))
        .limit(rawLimit)
        .offset((rawPage - 1) * rawLimit),
      db.select({ value: count() }).from(patients).where(where),
    ]);
    const total = totalRows[0]?.value ?? 0;
    return NextResponse.json({
      data: rows.map(serializePatient),
      pagination: {
        page: rawPage,
        limit: rawLimit,
        total,
        total_pages: Math.ceil(total / rawLimit),
      },
    });
  } catch (error) {
    return patientListDatabaseError(error);
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
      .returning();
    return NextResponse.json(
      { data: serializePatient(created) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create patient", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tạo hồ sơ bệnh nhân.");
  }
}
