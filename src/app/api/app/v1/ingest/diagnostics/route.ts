import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { deviceDiagnostics } from "@/lib/db/schema/wearables";
import { appError, epochToIso, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeIngest, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateDiagnostics } from "@/lib/app-api/validation";

/**
 * Số liệu hiệu năng của vòng (DIAG, mỗi cửa sổ 5 phút): % CPU, thời gian model / phút / ghi flash, RAM,
 * số giây bật WiFi, lý do reset. App chuyển tiếp (BLE) hoặc vòng tự gửi (WiFi). Khóa (device_id, boot_id,
 * uptime_s): gửi lại không trùng.
 */
export const POST = withAppErrors("ingest/diagnostics", async (request: NextRequest) => {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  const parsed = validateDiagnostics(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const { device_id, items } = parsed.data;

  if (auth.via === "device" && device_id !== auth.deviceId) {
    return appError(403, "WRONG_DEVICE", "device_id không khớp khóa thiết bị.");
  }
  const owner = await ensureDeviceForPatient(device_id, auth.patientId);
  if (!owner.ok) return owner.response;
  if (items.length === 0) return NextResponse.json({ accepted: 0 });

  const transport = auth.via === "device" ? "wifi" : parsed.data.transport;
  const inserted = await db
    .insert(deviceDiagnostics)
    .values(
      items.map((d) => ({
        deviceId: device_id,
        bootId: d.boot_id,
        uptimeS: d.uptime_s,
        patientId: auth.patientId,
        ts: epochToIso(d.ts),
        cpuAvgPct: d.cpu_avg_pct,
        cpuPeakPct: d.cpu_peak_pct,
        modelMs: d.model_ms,
        minuteMs: d.minute_ms,
        flashMs: d.flash_ms,
        heapMinKb: d.heap_min_kb,
        wifiS: d.wifi_s,
        resetReason: d.reset_reason,
        bleDrops: d.ble_drops,
        transport,
      })),
    )
    .onConflictDoNothing()
    .returning({ uptimeS: deviceDiagnostics.uptimeS });

  return NextResponse.json({ accepted: inserted.length, duplicates: items.length - inserted.length });
});
