import { NextResponse, type NextRequest } from "next/server";
import { appError } from "@/lib/app-api/http";
import { authorizeIngest, currentDeviceOf } from "@/lib/app-api/server";
import { toConfigV1 } from "@/lib/monitoring/config";
import { latestConfig } from "@/lib/monitoring/server";

/**
 * Vòng tự lấy ngưỡng khi chạy WiFi (CONFIG_VA_API.md §6.1): header x-device-id / x-device-key.
 * Gửi `if-none-match: "<version>"` thì trả 304 khi chưa có version mới.
 */
export async function GET(request: NextRequest) {
  const auth = await authorizeIngest(request);
  if (auth.response) return auth.response;
  if (auth.via !== "device") return appError(403, "FORBIDDEN", "Endpoint dành cho vòng đeo.");
  const [config, device] = await Promise.all([latestConfig(auth.patientId), currentDeviceOf(auth.patientId)]);
  const etag = `"${config.version}"`;
  if (request.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: { etag } });
  const body = toConfigV1(config, {
    deviceId: device?.deviceId ?? null,
    assignmentId: device?.assignmentId ?? null,
    appliedVersion: device?.appliedConfigVersion ?? null,
  });
  return NextResponse.json(body, { headers: { etag } });
}
