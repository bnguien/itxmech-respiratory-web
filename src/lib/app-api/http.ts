import { NextResponse } from "next/server";

/** Lỗi theo hợp đồng App–Web: `{"error":{"code","message"}}`. */
export function appError(
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: { code, message } }, { status, headers });
}

export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export const badRequest = (message = "Dữ liệu gửi lên không hợp lệ.") =>
  appError(400, "VALIDATION_ERROR", message);

export const epochToIso = (seconds: number) => new Date(seconds * 1000).toISOString();
