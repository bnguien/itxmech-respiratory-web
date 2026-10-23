import { isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { wearableAlerts } from "@/lib/db/schema/wearable-alerts";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

/** Đánh dấu mọi cảnh báo chưa xem là đã xem. */
export async function POST() {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  try {
    const rows = await db
      .update(wearableAlerts)
      .set({ acknowledgedAt: new Date().toISOString(), acknowledgedBy: auth.doctorId })
      .where(isNull(wearableAlerts.acknowledgedAt))
      .returning({ id: wearableAlerts.id });
    return NextResponse.json({ data: { acknowledged: rows.length } });
  } catch (error) {
    console.error("Unable to acknowledge alerts", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể cập nhật cảnh báo.");
  }
}
