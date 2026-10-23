import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableDevices } from "@/lib/db/schema/wearables";
import { appError, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateConfigAck } from "@/lib/app-api/validation";

/** Vòng đã áp dụng (hoặc từ chối) một version config, app báo thay vòng. */
export const POST = withAppErrors("ingest/config-ack", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateConfigAck(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const ack = parsed.data;

  // Vòng tự gửi qua WiFi chỉ được gửi dữ liệu của chính nó.
  if (auth.via === "device" && ack.device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(ack.device_id, auth.patientId);
  if (!owner.ok) return owner.response;

  await db
    .update(wearableDevices)
    .set({
      configStatus: ack.status,
      ...(ack.status !== "rejected" ? { appliedConfigVersion: ack.config_version } : {}),
    })
    .where(eq(wearableDevices.deviceId, ack.device_id));
  return new Response(null, { status: 204 });
});
