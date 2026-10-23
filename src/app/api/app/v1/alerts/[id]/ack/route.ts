import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableAlerts } from "@/lib/db/schema/wearable-alerts";
import { appError, withAppErrors } from "@/lib/app-api/http";
import { authorizeApp } from "@/lib/app-api/server";
import { serializeAppAlert } from "@/lib/alerts/server";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string }> };

/** Người nhà bấm "Đã biết" trên app. Bác sĩ vẫn thấy cảnh báo trên web, kèm tên người đã xác nhận. */
export const POST = withAppErrors("alerts/ack", async (request: NextRequest, { params }: Context) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return appError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
  const [row] = await db
    .update(wearableAlerts)
    .set({ familyAckedAt: new Date().toISOString(), familyAckedBy: auth.viewerName })
    .where(and(eq(wearableAlerts.id, id), eq(wearableAlerts.patientId, auth.patientId)))
    .returning();
  if (!row) return appError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
  return NextResponse.json(serializeAppAlert(row));
});
