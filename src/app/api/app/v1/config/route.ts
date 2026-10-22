import { NextResponse, type NextRequest } from "next/server";
import { defaultConfig } from "@/lib/app-api/config";
import { authorizeApp, currentDeviceOf } from "@/lib/app-api/server";

/** Ngưỡng theo dõi. Chưa có bảng monitoring_configs nên luôn trả config mặc định version 0. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const device = await currentDeviceOf(auth.patientId);
  return NextResponse.json(
    defaultConfig(device?.deviceId ?? null, device?.assignmentId ?? null, device !== null),
  );
}
