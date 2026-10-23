import { and, eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableDevices, wearableLive } from "@/lib/db/schema/wearables";
import { appError, epochToIso, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateLive } from "@/lib/app-api/validation";

/**
 * Số hiển thị 15 giây (LIVE v2) app gateway chuyển tiếp ngay khi nhận qua BLE. Ghi đè một dòng mỗi vòng
 * (bỏ qua gói cũ hơn dòng đang có), để app người nhà và web thấy cùng số, cùng giờ đo với máy đang nối vòng.
 */
export const POST = withAppErrors("ingest/live", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateLive(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const live = parsed.data;

  if (auth.via === "device" && live.device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(live.device_id, auth.patientId);
  if (!owner.ok) return owner.response;

  const transport = auth.via === "device" ? "wifi" : "ble_relay";
  const row = {
    deviceId: live.device_id,
    patientId: auth.patientId,
    ts: epochToIso(live.ts),
    spo2: live.spo2,
    spo2Min: live.spo2_min,
    pulse: live.pulse,
    sqi: live.sqi,
    valid: live.valid,
    worn: live.worn,
    transport,
    receivedAt: new Date().toISOString(),
  };
  const [stored] = await db
    .insert(wearableLive)
    .values(row)
    .onConflictDoUpdate({
      target: wearableLive.deviceId,
      set: row,
      // Gói đến trễ (mạng chập chờn) không đè số mới hơn.
      setWhere: sql`${wearableLive.ts} <= excluded.ts`,
    })
    .returning({ ts: wearableLive.ts });
  // wearable_devices có Realtime cho trang bác sĩ (mỗi lần đổi là tải lại cả trang SpO₂): chỉ cập nhật khi
  // lần cuối đã quá 60 giây hoặc trạng thái đeo / đường truyền đổi. "Lần cuối nhận" chính xác lấy từ received_at.
  await db
    .update(wearableDevices)
    .set({ lastSeenAt: new Date().toISOString(), worn: live.worn, transport })
    .where(
      and(
        eq(wearableDevices.deviceId, live.device_id),
        sql`(${wearableDevices.lastSeenAt} is null or ${wearableDevices.lastSeenAt} < now() - interval '60 seconds'
             or ${wearableDevices.worn} is distinct from ${live.worn}
             or ${wearableDevices.transport} is distinct from ${transport})`,
      ),
    );

  return NextResponse.json({ accepted: !!stored, server_time: Math.floor(Date.now() / 1000) });
});
