import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deviceAssignments, wearableDevices, wearableLive } from "@/lib/db/schema/wearables";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

type Context = { params: Promise<{ deviceId: string }> };
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * Gỡ vòng khỏi bệnh nhân đang gán (bác sĩ). Lần gửi kế tiếp từ app của bệnh nhân mới sẽ tự gán vòng
 * (ensureDeviceForPatient), thay vì bị chặn `403 WRONG_DEVICE`.
 * Xóa luôn khóa thiết bị (vòng thôi tự gửi qua WiFi bằng khóa cũ) và số 15 giây cuối (`GET /live` đọc theo
 * device_id, không xóa thì người mới thấy SpO₂ của người cũ cho tới gói kế tiếp).
 */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { deviceId } = await params;
  if (!DEVICE_ID_PATTERN.test(deviceId)) return apiError(404, "NOT_FOUND", "Không tìm thấy vòng.");
  try {
    const now = new Date().toISOString();
    const closed = await db.transaction(async (tx) => {
      const rows = await tx
        .update(deviceAssignments)
        .set({ unassignedAt: now })
        .where(and(eq(deviceAssignments.deviceId, deviceId), isNull(deviceAssignments.unassignedAt)))
        .returning({ patientId: deviceAssignments.patientId });
      if (rows.length === 0) return rows;
      await tx.update(wearableDevices).set({ deviceKeyHash: null }).where(eq(wearableDevices.deviceId, deviceId));
      await tx.delete(wearableLive).where(eq(wearableLive.deviceId, deviceId));
      return rows;
    });
    if (closed.length === 0) return apiError(404, "NOT_ASSIGNED", "Vòng này đang không gán cho bệnh nhân nào.");
    return NextResponse.json({
      data: { device_id: deviceId, unassigned_at: now, previous_patient_id: closed[0].patientId },
    });
  } catch (error) {
    console.error("Unable to unassign device", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể gỡ vòng.");
  }
}
