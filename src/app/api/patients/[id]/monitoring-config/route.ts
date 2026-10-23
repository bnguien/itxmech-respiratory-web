import { and, eq, isNull } from "drizzle-orm";
import { after, NextResponse, type NextRequest } from "next/server";
import { pushToPatient } from "@/lib/push/fcm";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { currentDeviceOf } from "@/lib/app-api/server";
import { validateThresholds } from "@/lib/monitoring/config";
import { configHistory, createConfig, latestConfig } from "@/lib/monitoring/server";
import { apiError, authorizeDoctor, validationError } from "@/lib/patients/server";
import { wearableDevices } from "@/lib/db/schema/wearables";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function activePatientExists(id: string) {
  const [row] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(and(eq(patients.id, id), isNull(patients.archivedAt)))
    .limit(1);
  return !!row;
}

async function payload(patientId: string) {
  const [history, device] = await Promise.all([configHistory(patientId), currentDeviceOf(patientId)]);
  const current = history[0] ?? (await latestConfig(patientId));
  let configStatus: string | null = null;
  if (device) {
    const [row] = await db
      .select({ configStatus: wearableDevices.configStatus })
      .from(wearableDevices)
      .where(eq(wearableDevices.deviceId, device.deviceId))
      .limit(1);
    configStatus = row?.configStatus ?? null;
  }
  return {
    current,
    history,
    device: device
      ? {
          device_id: device.deviceId,
          applied_version: device.appliedConfigVersion,
          config_status: configStatus,
          last_seen_at: device.lastSeenAt,
        }
      : null,
  };
}

/** Ngưỡng đang đặt, lịch sử các version và version vòng đã áp dụng. */
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  try {
    if (!(await activePatientExists(id))) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    return NextResponse.json({ data: await payload(id) });
  } catch (error) {
    console.error("Unable to read monitoring config", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải ngưỡng theo dõi.");
  }
}

/**
 * Lưu ngưỡng mới thành version kế tiếp. App của người nhà nhận version mới (qua `GET /config` hoặc
 * `config_version_latest` trong response ingest), ghi xuống vòng qua BLE, rồi báo lại `ingest/config-ack`.
 */
export async function PUT(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    body = parsed as Record<string, unknown>;
  } catch {
    return validationError([{ field: "body", message: "Dữ liệu JSON không hợp lệ." }]);
  }

  try {
    if (!(await activePatientExists(id))) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    const current = await latestConfig(id);
    const result = validateThresholds(body, current.thresholds);
    if (result.error !== undefined) return validationError([{ field: "thresholds", message: result.error }]);
    const preset = typeof body.preset === "string" ? body.preset.slice(0, 40) : "custom";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    await createConfig(id, auth.doctorId, result.data, preset, note);
    // App đang nối vòng tải ngưỡng mới ngay và ghi xuống vòng qua BLE, không chờ lần gửi telemetry kế tiếp.
    // Vòng đang chạy WiFi sẽ tự lấy ở lượt WiFi sau (GET device/config).
    after(() => pushToPatient(id, { type: "config_changed" }));
    return NextResponse.json({ data: await payload(id) });
  } catch (error) {
    console.error("Unable to save monitoring config", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể lưu ngưỡng theo dõi.");
  }
}
