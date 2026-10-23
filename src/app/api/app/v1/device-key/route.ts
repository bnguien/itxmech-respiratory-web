import { NextResponse, type NextRequest } from "next/server";
import { appError, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeApp, ensureDeviceForPatient, issueDeviceKey } from "@/lib/app-api/server";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{3,40}$/;

/**
 * App đang kết nối vòng xin khóa thiết bị cho vòng của bệnh nhân này, rồi ghi khóa + địa chỉ server xuống vòng
 * qua BLE (WIFI_PROV op 0x03). Vòng dùng khóa trong header `x-device-key` khi tự gửi dữ liệu qua WiFi.
 * Mỗi lần gọi tạo khóa mới; khóa cũ hết hiệu lực.
 */
export const POST = withAppErrors("device-key", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const body = await readJsonObject(request);
  const deviceId = typeof body?.device_id === "string" ? body.device_id : "";
  if (!DEVICE_ID_PATTERN.test(deviceId)) return appError(400, "VALIDATION_ERROR", "device_id không hợp lệ.");

  const owner = await ensureDeviceForPatient(deviceId, auth.patientId);
  if (!owner.ok) return owner.response;
  const key = await issueDeviceKey(deviceId);
  return NextResponse.json({ device_id: deviceId, device_key: key });
});
