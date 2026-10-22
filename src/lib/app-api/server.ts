import "server-only";

import { and, eq, isNull, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions, patientAppAccess } from "@/lib/db/schema/app-access";
import { deviceAssignments, wearableDevices } from "@/lib/db/schema/wearables";
import {
  generateAccessCode,
  generateRefreshToken,
  hashAccessCode,
  hashRefreshToken,
  REFRESH_TOKEN_TTL_SECONDS,
  signAccessToken,
  verifyAccessToken,
  ACCESS_TOKEN_TTL_SECONDS,
} from "./crypto";
import { appError } from "./http";

type Db = typeof db;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Tạo (hoặc cấp lại) mã truy cập app cho bệnh nhân. Trả mã dạng rõ, chỉ hiện một lần cho bác sĩ. */
export async function issueAppAccessCode(patientId: string, executor: Db | Tx = db): Promise<string> {
  const code = generateAccessCode();
  const hash = await hashAccessCode(code);
  const now = new Date().toISOString();
  await executor
    .insert(patientAppAccess)
    .values({ patientId, accessCodeHash: hash, rotatedAt: now })
    .onConflictDoUpdate({
      target: patientAppAccess.patientId,
      set: { accessCodeHash: hash, rotatedAt: now, failedAttempts: 0, lockedUntil: null, revokedAt: null },
    });
  return code;
}

/** Cấp lại mã: các máy đang đăng nhập bằng mã cũ bị đăng xuất. */
export async function rotateAppAccessCode(patientId: string): Promise<string> {
  return db.transaction(async (tx) => {
    const code = await issueAppAccessCode(patientId, tx);
    await tx
      .update(appSessions)
      .set({ revokedAt: new Date().toISOString() })
      .where(and(eq(appSessions.patientId, patientId), isNull(appSessions.revokedAt)));
    return code;
  });
}

export interface IssuedTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export function issueTokens(sessionId: string, patientId: string): IssuedTokens & { refreshHash: string; refreshExpiresAt: string } {
  const refresh = generateRefreshToken();
  return {
    access_token: signAccessToken(sessionId, patientId),
    refresh_token: refresh,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refreshHash: hashRefreshToken(refresh),
    refreshExpiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
  };
}

/** Chỉ một máy làm gateway BLE cho mỗi bệnh nhân: bật ở máy này thì tắt ở các máy khác. */
export async function claimBleGateway(patientId: string, sessionId: string, executor: Db | Tx = db) {
  await executor
    .update(appSessions)
    .set({ isBleGateway: false })
    .where(and(eq(appSessions.patientId, patientId), ne(appSessions.id, sessionId), eq(appSessions.isBleGateway, true)));
}

export type AppAuthorization =
  | { sessionId: string; patientId: string; viewerName: string; response?: never }
  | { sessionId?: never; patientId?: never; viewerName?: never; response: Response };

/** Kiểm tra `Authorization: Bearer <access_token>` và phiên còn hiệu lực. */
export async function authorizeApp(request: NextRequest): Promise<AppAuthorization> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const claims = token ? verifyAccessToken(token) : null;
  if (!claims) return { response: appError(401, "UNAUTHORIZED", "Phiên đăng nhập đã hết hạn.") };

  const [session] = await db
    .select({ id: appSessions.id, patientId: appSessions.patientId, viewerName: appSessions.viewerName, revokedAt: appSessions.revokedAt })
    .from(appSessions)
    .where(eq(appSessions.id, claims.sub))
    .limit(1);
  if (!session || session.revokedAt || session.patientId !== claims.pid) {
    return { response: appError(401, "SESSION_REVOKED", "Phiên đăng nhập đã bị thu hồi.") };
  }
  void db
    .update(appSessions)
    .set({ lastSeenAt: new Date().toISOString() })
    .where(eq(appSessions.id, session.id))
    .catch(() => undefined);
  return { sessionId: session.id, patientId: session.patientId, viewerName: session.viewerName };
}

export interface CurrentDevice {
  assignmentId: number;
  deviceId: string;
  batteryPct: number | null;
  worn: boolean | null;
  lastSeenAt: string | null;
  transport: string | null;
  backlog: number | null;
  appliedConfigVersion: number;
}

export async function currentDeviceOf(patientId: string): Promise<CurrentDevice | null> {
  const [row] = await db
    .select({
      assignmentId: deviceAssignments.id,
      deviceId: wearableDevices.deviceId,
      batteryPct: wearableDevices.batteryPct,
      worn: wearableDevices.worn,
      lastSeenAt: wearableDevices.lastSeenAt,
      transport: wearableDevices.transport,
      backlog: wearableDevices.backlog,
      appliedConfigVersion: wearableDevices.appliedConfigVersion,
    })
    .from(deviceAssignments)
    .innerJoin(wearableDevices, eq(deviceAssignments.deviceId, wearableDevices.deviceId))
    .where(and(eq(deviceAssignments.patientId, patientId), isNull(deviceAssignments.unassignedAt)))
    .limit(1);
  return row ?? null;
}

/**
 * Giai đoạn 1: vòng gửi qua app của bệnh nhân nào thì tự gán cho bệnh nhân đó nếu chưa gán ai.
 * Vòng đang gán cho bệnh nhân khác → từ chối (WRONG_DEVICE). Bệnh nhân đang có vòng khác → gỡ vòng cũ.
 */
export async function ensureDeviceForPatient(
  deviceId: string,
  patientId: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  return db.transaction(async (tx) => {
    await tx.insert(wearableDevices).values({ deviceId }).onConflictDoNothing();
    const [open] = await tx
      .select({ id: deviceAssignments.id, patientId: deviceAssignments.patientId })
      .from(deviceAssignments)
      .where(and(eq(deviceAssignments.deviceId, deviceId), isNull(deviceAssignments.unassignedAt)))
      .limit(1);
    if (open && open.patientId !== patientId) {
      return {
        ok: false as const,
        response: appError(403, "WRONG_DEVICE", "Vòng này đang được giao cho bệnh nhân khác."),
      };
    }
    if (!open) {
      const now = new Date().toISOString();
      await tx
        .update(deviceAssignments)
        .set({ unassignedAt: now })
        .where(and(eq(deviceAssignments.patientId, patientId), isNull(deviceAssignments.unassignedAt)));
      await tx.insert(deviceAssignments).values({ deviceId, patientId });
    }
    return { ok: true as const };
  });
}
