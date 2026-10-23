import { after, NextResponse, type NextRequest } from "next/server";
import { pushAlertEvents, recordAlerts } from "@/lib/alerts/server";
import { db } from "@/lib/db";
import { wearableAssessments } from "@/lib/db/schema/wearables";
import { appError, epochToIso, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateAssessments } from "@/lib/app-api/validation";

/** Kết quả luật + model của vòng. Upsert theo (device_id, seq). */
export const POST = withAppErrors("ingest/assessments", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateAssessments(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const { device_id, items } = parsed.data;

  // Vòng tự gửi qua WiFi chỉ được gửi dữ liệu của chính nó.
  if (auth.via === "device" && device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(device_id, auth.patientId);
  if (!owner.ok) return owner.response;
  if (items.length === 0) return NextResponse.json({ accepted: 0 });

  const inserted = await db
    .insert(wearableAssessments)
    .values(
      items.map((a) => ({
        deviceId: device_id,
        seq: a.seq,
        patientId: auth.patientId,
        ts: epochToIso(a.ts),
        level: a.level,
        trigger: a.trigger,
        notify: a.notify,
        ranModel: a.ran_model,
        outQ: a.out_q,
        thresholdT: a.T,
        spo2Now: a.spo2_now,
        pulseNow: a.pulse_now,
        reasons: a.reasons,
        localNotified: a.local_notified,
        configVersion: a.config_version,
        modelVersion: a.model_version,
      })),
    )
    .onConflictDoNothing()
    .returning({ seq: wearableAssessments.seq });

  // Cảnh báo ALERT / CRITICAL: chỉ tính các dòng mới lưu (gửi lại không báo trùng). Lỗi ở bước này không làm mất
  // dữ liệu đã lưu, chỉ ghi log; thông báo đẩy gửi sau khi đã trả lời vòng / app.
  const fresh = new Set(inserted.map((row) => row.seq));
  try {
    const events = await recordAlerts(
      auth.patientId,
      device_id,
      auth.via === "device" ? "wifi" : "ble_relay",
      items.filter((a) => fresh.has(a.seq)),
    );
    if (events.length > 0) after(() => pushAlertEvents(auth.patientId, events));
  } catch (error) {
    console.error("[App API] ingest/assessments: không tạo được cảnh báo", { message: error instanceof Error ? error.message : String(error) });
  }
  return NextResponse.json({ accepted: inserted.length });
});
