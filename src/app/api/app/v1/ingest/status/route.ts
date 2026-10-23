import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableDevices } from "@/lib/db/schema/wearables";
import { appError, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { latestConfigVersion } from "@/lib/monitoring/server";
import { validateStatus } from "@/lib/app-api/validation";

/** Pin, trạng thái đeo, backlog, config đang áp dụng của vòng. */
export const POST = withAppErrors("ingest/status", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateStatus(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const s = parsed.data;

  // Vòng tự gửi qua WiFi chỉ được gửi dữ liệu của chính nó.
  if (auth.via === "device" && s.device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(s.device_id, auth.patientId);
  if (!owner.ok) return owner.response;

  await db
    .update(wearableDevices)
    .set({
      batteryPct: s.battery,
      worn: s.worn,
      backlog: s.backlog,
      lastSeenAt: new Date().toISOString(),
      transport: s.transport,
      ...(s.boot_id !== null ? { bootId: s.boot_id } : {}),
      ...(s.fw ? { fw: s.fw } : {}),
      ...(s.model_version ? { modelVersion: s.model_version } : {}),
      ...(s.config_version !== null ? { appliedConfigVersion: s.config_version } : {}),
    })
    .where(eq(wearableDevices.deviceId, s.device_id));

  return NextResponse.json({ config_version_latest: await latestConfigVersion(auth.patientId), server_time: Math.floor(Date.now() / 1000) });
});
