import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableDevices } from "@/lib/db/schema/wearables";
import { appError, readJsonObject } from "@/lib/app-api/http";
import { authorizeApp, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateConfigAck } from "@/lib/app-api/validation";

/** Vòng đã áp dụng (hoặc từ chối) một version config, app báo thay vòng. */
export async function POST(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const parsed = validateConfigAck(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const ack = parsed.data;

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
}
