import { and, eq, gt, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";
import { hashRefreshToken } from "@/lib/app-api/crypto";
import { appError, readJsonObject } from "@/lib/app-api/http";
import { issueTokens } from "@/lib/app-api/server";

/** Đổi refresh token lấy cặp token mới (refresh token cũ hết hiệu lực ngay). */
export async function POST(request: NextRequest) {
  const body = await readJsonObject(request);
  const token = typeof body?.refresh_token === "string" ? body.refresh_token : "";
  if (!token) return appError(401, "UNAUTHORIZED", "Thiếu refresh token.");

  try {
    const [session] = await db
      .select({ id: appSessions.id, patientId: appSessions.patientId })
      .from(appSessions)
      .where(
        and(
          eq(appSessions.refreshTokenHash, hashRefreshToken(token)),
          isNull(appSessions.revokedAt),
          gt(appSessions.refreshExpiresAt, new Date().toISOString()),
        ),
      )
      .limit(1);
    if (!session) return appError(401, "SESSION_REVOKED", "Phiên đăng nhập đã hết hạn, đăng nhập lại.");

    const tokens = issueTokens(session.id, session.patientId);
    await db
      .update(appSessions)
      .set({
        refreshTokenHash: tokens.refreshHash,
        refreshExpiresAt: tokens.refreshExpiresAt,
        lastSeenAt: new Date().toISOString(),
      })
      .where(eq(appSessions.id, session.id));
    return NextResponse.json({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    console.error("[App API] refresh failed", error);
    return appError(500, "INTERNAL_ERROR", "Máy chủ đang gặp sự cố.");
  }
}
