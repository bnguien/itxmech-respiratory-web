import { and, count, desc, ilike, isNotNull, or } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import {
  apiError,
  authorizeDoctor,
  serializePatient,
  validationError,
} from "@/lib/patients/server";

export async function GET(request: NextRequest) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
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
    return validationError([
      {
        field: "pagination",
        message: "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
      },
    ]);
  const search = q
    ? or(
        ilike(patients.fullName, `%${q}%`),
        ilike(patients.patientCode, `%${q}%`),
        ilike(patients.phone, `%${q}%`),
      )
    : undefined;
  const where = and(isNotNull(patients.archivedAt), search);
  try {
    const [rows, totalRows] = await Promise.all([
      db
        .select()
        .from(patients)
        .where(where)
        .orderBy(desc(patients.archivedAt), desc(patients.patientCode))
        .limit(limit)
        .offset((page - 1) * limit),
      db.select({ value: count() }).from(patients).where(where),
    ]);
    const total = totalRows[0]?.value ?? 0;
    return NextResponse.json({
      data: rows.map(serializePatient),
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Unable to list archived patients", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Không thể tải danh sách bệnh nhân đã lưu trữ.",
    );
  }
}
