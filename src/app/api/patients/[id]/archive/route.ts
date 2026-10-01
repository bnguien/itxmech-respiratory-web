import { and, eq, isNull } from "drizzle-orm";
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
    const [archived] = await db
      .update(patients)
      .set({
        archivedAt: new Date().toISOString(),
        archivedBy: auth.doctorId,
        updatedAt: new Date().toISOString(),
      })
      .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
      .returning({ id: patients.id });
    if (!archived)
      return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({
      success: true,
      message: "Đã lưu trữ hồ sơ bệnh nhân.",
    });
  } catch (error) {
    console.error("Unable to archive patient", error);
    return apiError(
      500,
      "INTERNAL_ERROR",
      "Không thể lưu trữ hồ sơ bệnh nhân.",
    );
  }
}
