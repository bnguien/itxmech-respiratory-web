import "server-only";

import { timingSafeEqual } from "node:crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions, patientAppAccess } from "@/lib/db/schema/app-access";
import { deviceAssignments, wearableDevices } from "@/lib/db/schema/wearables";
import {
  decryptAccessCode,
  encryptAccessCode,
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

/**
 * Tạo (hoặc cấp lại) mã truy cập app cho bệnh nhân. Lưu hash để kiểm tra đăng nhập và bản mã hóa để bác sĩ
 * xem / in lại phiếu bất cứ lúc nào.
 */
export async function issueAppAccessCode(patientId: string, executor: Db | Tx = db): Promise<string> {
  const code = generateAccessCode();
  const hash = await hashAccessCode(code);
  const enc = encryptAccessCode(code);
  const now = new Date().toISOString();
  await executor
    .insert(patientAppAccess)
    .values({ patientId, accessCodeHash: hash, accessCodeEnc: enc, rotatedAt: now })
    .onConflictDoUpdate({
      target: patientAppAccess.patientId,
      set: { accessCodeHash: hash, accessCodeEnc: enc, rotatedAt: now, failedAttempts: 0, lockedUntil: null, revokedAt: null },
    });
  return code;
}

/**
 * Cấp mã mới (khi mã bị lộ, hoặc mã cũ không còn xem được). Các máy đang đăng nhập vẫn giữ phiên,
 * người nhà không phải đăng nhập lại; chỉ lần đăng nhập mới phải dùng mã mới.
 */
export async function rotateAppAccessCode(patientId: string): Promise<string> {
  return issueAppAccessCode(patientId);
}

/** Mã truy cập hiện tại để in phiếu. null: chưa cấp, đã thu hồi, hoặc mã cấp trước khi có bản mã hóa. */
export async function readAppAccessCode(patientId: string): Promise<string | null> {
  const [row] = await db
    .select({ enc: patientAppAccess.accessCodeEnc, revokedAt: patientAppAccess.revokedAt })
    .from(patientAppAccess)
    .where(eq(patientAppAccess.patientId, patientId))
    .limit(1);
  if (!row || row.revokedAt || !row.enc) return null;
  return decryptAccessCode(row.enc);
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

export type IngestAuthorization =
  | { patientId: string; via: "app" | "device"; deviceId: string | null; response?: never }
  | { patientId?: never; via?: never; deviceId?: never; response: Response };

/**
 * Xác thực cho `ingest/*`: app người nhà (Bearer token, `transport: ble_relay`) hoặc chính vòng khi tự gửi qua WiFi
 * (header `x-device-id` + `x-device-key`, khóa do app cấp qua `POST device-key` rồi ghi xuống vòng bằng BLE).
 */
export async function authorizeIngest(request: NextRequest): Promise<IngestAuthorization> {
  const deviceId = request.headers.get("x-device-id");
  const deviceKey = request.headers.get("x-device-key");
  if (!deviceId && !deviceKey) {
    const app = await authorizeApp(request);
    if (app.response) return { response: app.response };
    return { patientId: app.patientId, via: "app", deviceId: null };
  }
  if (!deviceId || !deviceKey) return { response: appError(401, "UNAUTHORIZED", "Thiếu x-device-id hoặc x-device-key.") };

  const [row] = await db
    .select({ hash: wearableDevices.deviceKeyHash })
    .from(wearableDevices)
    .where(eq(wearableDevices.deviceId, deviceId))
    .limit(1);
  const expected = row?.hash ? Buffer.from(row.hash) : null;
  const actual = Buffer.from(hashDeviceKey(deviceKey));
  if (!expected || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { response: appError(401, "UNAUTHORIZED", "Khóa thiết bị không đúng.") };
  }
  const [assignment] = await db
    .select({ patientId: deviceAssignments.patientId })
    .from(deviceAssignments)
    .where(and(eq(deviceAssignments.deviceId, deviceId), isNull(deviceAssignments.unassignedAt)))
    .limit(1);
  if (!assignment) return { response: appError(404, "NO_ASSIGNMENT", "Vòng chưa được giao cho bệnh nhân nào.") };
  await db.update(wearableDevices).set({ lastSeenAt: new Date().toISOString(), transport: "wifi" }).where(eq(wearableDevices.deviceId, deviceId));
  return { patientId: assignment.patientId, via: "device", deviceId };
}

/** Khóa thiết bị mới cho vòng (thay khóa cũ). Chỉ trả một lần; DB giữ SHA-256. */
export async function issueDeviceKey(deviceId: string): Promise<string> {
  const key = generateRefreshToken();
  await db.update(wearableDevices).set({ deviceKeyHash: hashDeviceKey(key) }).where(eq(wearableDevices.deviceId, deviceId));
  return key;
}

const hashDeviceKey = (key: string) => hashRefreshToken(`device:${key}`);
