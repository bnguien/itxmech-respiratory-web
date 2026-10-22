import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";
import { appError, readJsonObject } from "@/lib/app-api/http";
import { authorizeApp, claimBleGateway } from "@/lib/app-api/server";

/** Đổi vai trò gateway BLE hoặc cập nhật FCM token của máy này. */
export async function PATCH(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const body = await readJsonObject(request);
  if (!body) return appError(400, "VALIDATION_ERROR", "Dữ liệu JSON không hợp lệ.");

  const set: { isBleGateway?: boolean; fcmToken?: string | null } = {};
  if (typeof body.is_ble_gateway === "boolean") set.isBleGateway = body.is_ble_gateway;
  if (typeof body.fcm_token === "string" || body.fcm_token === null) set.fcmToken = body.fcm_token;
  if (Object.keys(set).length === 0) return new Response(null, { status: 204 });

  await db.transaction(async (tx) => {
    await tx.update(appSessions).set(set).where(eq(appSessions.id, auth.sessionId));
    if (set.isBleGateway) await claimBleGateway(auth.patientId, auth.sessionId, tx);
  });
  return new Response(null, { status: 204 });
}
