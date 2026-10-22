import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { appSessions, patientAppAccess } from "@/lib/db/schema/app-access";
import { patients } from "@/lib/db/schema/patients";
import { verifyAccessCode } from "@/lib/app-api/crypto";
import { appError, readJsonObject } from "@/lib/app-api/http";
import { claimBleGateway, currentDeviceOf, issueTokens } from "@/lib/app-api/server";
import { validateLogin } from "@/lib/app-api/validation";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 15 * 60;

const invalid = () => appError(401, "INVALID_CREDENTIALS", "Mã bệnh nhân hoặc mã truy cập không đúng.");

/** Người nhà đăng nhập app bằng mã bệnh nhân + mã truy cập 6 số bác sĩ cấp. */
export async function POST(request: NextRequest) {
  const parsed = validateLogin(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const input = parsed.data;

  try {
    const [row] = await db
      .select({
        patientId: patients.id,
        patientCode: patients.patientCode,
        fullName: patients.fullName,
        archivedAt: patients.archivedAt,
        hash: patientAppAccess.accessCodeHash,
        failedAttempts: patientAppAccess.failedAttempts,
        lockedUntil: patientAppAccess.lockedUntil,
        revokedAt: patientAppAccess.revokedAt,
      })
      .from(patients)
      .leftJoin(patientAppAccess, eq(patientAppAccess.patientId, patients.id))
      .where(eq(patients.patientCode, input.patient_code))
      .limit(1);

    if (!row || !row.hash || row.archivedAt) return invalid();
    if (row.revokedAt) return appError(403, "ACCESS_REVOKED", "Bác sĩ đã thu hồi mã truy cập này.");

    const now = Date.now();
    const lockedMs = row.lockedUntil ? new Date(row.lockedUntil).getTime() - now : 0;
    if (lockedMs > 0) {
      return appError(429, "TOO_MANY_ATTEMPTS", "Sai quá 5 lần, thử lại sau.", {
        "Retry-After": String(Math.ceil(lockedMs / 1000)),
      });
    }

    if (!(await verifyAccessCode(input.access_code, row.hash))) {
      const failed = (row.failedAttempts ?? 0) + 1;
      const lock = failed >= MAX_FAILED_ATTEMPTS;
      await db
        .update(patientAppAccess)
        .set(
          lock
            ? { failedAttempts: 0, lockedUntil: new Date(now + LOCK_SECONDS * 1000).toISOString() }
            : { failedAttempts: failed },
        )
        .where(eq(patientAppAccess.patientId, row.patientId));
      if (lock) {
        return appError(429, "TOO_MANY_ATTEMPTS", "Sai quá 5 lần, thử lại sau 15 phút.", {
          "Retry-After": String(LOCK_SECONDS),
        });
      }
      return invalid();
    }

    const sessionId = randomUUID();
    const tokens = issueTokens(sessionId, row.patientId);
    await db.transaction(async (tx) => {
      if (row.failedAttempts) {
        await tx.update(patientAppAccess).set({ failedAttempts: 0 }).where(eq(patientAppAccess.patientId, row.patientId));
      }
      await tx.insert(appSessions).values({
        id: sessionId,
        patientId: row.patientId,
        viewerName: input.viewer_name,
        role: input.role,
        isBleGateway: input.is_ble_gateway,
        fcmToken: input.fcm_token,
        appInstallId: input.app_install_id,
        refreshTokenHash: tokens.refreshHash,
        refreshExpiresAt: tokens.refreshExpiresAt,
      });
      if (input.is_ble_gateway) await claimBleGateway(row.patientId, sessionId, tx);
    });

    const device = await currentDeviceOf(row.patientId);
    return NextResponse.json({
      session_id: sessionId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      patient: { id: row.patientId, patient_code: row.patientCode, full_name: row.fullName },
      device: device ? { device_id: device.deviceId } : null,
    });
  } catch (error) {
    console.error("[App API] login failed", error);
    return appError(500, "INTERNAL_ERROR", "Máy chủ đang gặp sự cố, thử lại sau.");
  }
}
