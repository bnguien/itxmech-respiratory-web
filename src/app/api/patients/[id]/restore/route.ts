import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id))
    return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  try {
    const [restored] = await db
      .update(patients)
      .set({
        archivedAt: null,
        archivedBy: null,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(patients.id, id), isNotNull(patients.archivedAt)))
      .returning({ id: patients.id });
    if (!restored)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân đã lưu trữ.");
    return NextResponse.json({
      success: true,
      message: "Đã khôi phục hồ sơ bệnh nhân.",
    });
  } catch (error) {
    console.error("Unable to restore patient", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Không thể khôi phục hồ sơ bệnh nhân.",
    );
  }
}
