import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableAlerts } from "@/lib/db/schema/wearable-alerts";
import { apiError, authorizeDoctor } from "@/lib/patients/server";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string }> };

/** Bác sĩ đã xem cảnh báo: thẻ Nguy hiểm biến mất, chuông bớt một. */
export async function POST(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
  try {
    const [row] = await db
      .update(wearableAlerts)
      .set({ acknowledgedAt: new Date().toISOString(), acknowledgedBy: auth.doctorId })
      .where(eq(wearableAlerts.id, id))
      .returning({ id: wearableAlerts.id, acknowledgedAt: wearableAlerts.acknowledgedAt });
    if (!row) return apiError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
    return NextResponse.json({ data: { id: row.id, acknowledged_at: row.acknowledgedAt } });
  } catch (error) {
    console.error("Unable to acknowledge alert", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể cập nhật cảnh báo.");
  }
}
