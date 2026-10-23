import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { vitalsMinute, wearableDevices } from "@/lib/db/schema/wearables";
import { appError, epochToIso, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { latestConfigVersion } from "@/lib/monitoring/server";
import { validateTelemetry } from "@/lib/app-api/validation";

/**
 * Lô bản ghi phút app chuyển tiếp từ vòng (BLE). Upsert theo (device_id, seq): gửi lại không trùng.
 * acked_seq = seq lớn nhất trong lô: mọi bản ghi hợp lệ đã có trong DB sau lệnh này; bản ghi chưa có giờ
 * thật (vòng chưa đồng bộ giờ) bị bỏ hẳn, vẫn tính vào acked_seq để app không gửi lại mãi.
 */
export const POST = withAppErrors("ingest/telemetry", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateTelemetry(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const input = parsed.data;

  // Vòng tự gửi qua WiFi chỉ được gửi dữ liệu của chính nó.
  if (auth.via === "device" && input.device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(input.device_id, auth.patientId);
  if (!owner.ok) return owner.response;

  let accepted = 0;
  if (input.samples.length > 0) {
    const inserted = await db
      .insert(vitalsMinute)
      .values(
        input.samples.map((s) => ({
          deviceId: input.device_id,
          seq: s.seq,
          patientId: auth.patientId,
          ts: epochToIso(s.ts),
          spo2Mean: s.spo2_mean,
          spo2Min: s.spo2_min,
          spo2Valid: s.spo2_valid,
          pulseMean: s.pulse_mean,
          sqi: s.sqi,
          worn: s.worn,
          transport: input.transport,
        })),
      )
      .onConflictDoNothing()
      .returning({ seq: vitalsMinute.seq });
    accepted = inserted.length;
  }

  const ackedSeq = input.max_seq;
  await db
    .update(wearableDevices)
    .set({
      lastSeenAt: new Date().toISOString(),
      transport: input.transport,
      ...(input.fw ? { fw: input.fw } : {}),
      ...(input.model_version ? { modelVersion: input.model_version } : {}),
      ...(input.boot_id !== null ? { bootId: input.boot_id } : {}),
      ...(ackedSeq >= 0 ? { lastSeq: sql`greatest(coalesce(${wearableDevices.lastSeq}, 0), ${ackedSeq})` } : {}),
    })
    .where(eq(wearableDevices.deviceId, input.device_id));

  return NextResponse.json({
    accepted,
    duplicates: input.samples.length - accepted,
    acked_seq: Math.max(ackedSeq, 0),
    config_version_latest: await latestConfigVersion(auth.patientId),
    server_time: Math.floor(Date.now() / 1000),
  });
});
