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

/** Mã lỗi Postgres / postgres.js khi DB tạm không với tới được (hết kết nối pooler, rớt mạng, quá thời gian chờ). */
const TRANSIENT_DB_CODES = new Set([
  "EMAXCONNSESSION",
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "08000",
  "08001",
  "08003",
  "08006",
  "53300",
  "57P01",
  "57P03",
]);

/** Mã lỗi gốc, đi qua lớp bọc của Drizzle (`cause`). */
export function errorCode(error: unknown): string | null {
  for (let e = error, depth = 0; e && typeof e === "object" && depth < 4; e = (e as { cause?: unknown }).cause, depth++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

export const isTransientDbError = (error: unknown) => TRANSIENT_DB_CODES.has(errorCode(error) ?? "");

/**
 * Bọc handler của `/api/app/v1/*`: lỗi không lường trước (DB mất kết nối…) vẫn trả đúng dạng `{"error":{…}}`.
 * Lỗi tạm thời trả 503 + Retry-After để app và vòng biết chỉ cần gửi lại sau; dữ liệu vẫn nằm trong outbox / flash.
 */
export function withAppErrors<A extends unknown[]>(name: string, handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      const code = errorCode(error);
      if (isTransientDbError(error)) {
        console.warn(`[App API] ${name}: database unavailable`, { code });
        return appError(503, "SERVICE_UNAVAILABLE", "Máy chủ tạm thời không kết nối được cơ sở dữ liệu. Vui lòng thử lại sau.", {
          "retry-after": "30",
        });
      }
      console.error(`[App API] ${name} failed`, { code, message: error instanceof Error ? error.message : String(error) });
      return appError(500, "INTERNAL_ERROR", "Máy chủ gặp lỗi khi xử lý yêu cầu.");
    }
  };
}
