import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { apiError, authorizeDoctor } from "@/lib/patients/server";
import { isWearableRange } from "@/lib/wearable/chart";
import { readPatientWearable } from "@/lib/wearable/server";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** SpO₂ thật của bệnh nhân: trạng thái vòng, ngưỡng, bản ghi 24 giờ, biểu đồ theo `range`, nhật ký đánh giá. */
export async function GET(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  const range = request.nextUrl.searchParams.get("range") ?? "24h";
  if (!isWearableRange(range)) return apiError(400, "VALIDATION_ERROR", "range là 24h, 7d hoặc 30d.");
  try {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
      .limit(1);
    if (!patient) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({ data: await readPatientWearable(id, range) });
  } catch (error) {
    console.error("Unable to read patient wearable data", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải dữ liệu SpO₂.");
  }
}
