import { NextResponse, type NextRequest } from "next/server";
import { toConfigV1 } from "@/lib/monitoring/config";
import { latestConfig } from "@/lib/monitoring/server";
import { authorizeApp, currentDeviceOf } from "@/lib/app-api/server";
import { withAppErrors } from "@/lib/app-api/http";

/** Ngưỡng theo dõi mới nhất bác sĩ đặt (config.v1). Chưa đặt thì là ngưỡng xuất xưởng version 0. */
export const GET = withAppErrors("config", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const [config, device] = await Promise.all([latestConfig(auth.patientId), currentDeviceOf(auth.patientId)]);
  return NextResponse.json(
    toConfigV1(config, {
      deviceId: device?.deviceId ?? null,
      assignmentId: device?.assignmentId ?? null,
      appliedVersion: device?.appliedConfigVersion ?? null,
    }),
  );
});
