import "server-only";

import { createSign } from "node:crypto";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";

/**
 * Gửi thông báo đẩy tới app người nhà qua FCM HTTP v1, không cần thư viện firebase-admin.
 * Khóa tài khoản dịch vụ đọc từ FIREBASE_SERVICE_ACCOUNT_JSON (nội dung file JSON, hoặc base64 của nó),
 * hoặc từ bộ ba FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY.
 * Chưa cấu hình thì bỏ qua (log một lần), mọi lỗi đều được nuốt: thông báo đẩy không bao giờ làm hỏng request gọi nó.
 */

interface Credentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

/** Hợp đồng App–Web: data message, giá trị đều là chuỗi. App tự hiện thông báo (PushMessageHandler). */
export type PushData = Record<string, string>;

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const REQUEST_TIMEOUT_MS = 10_000;

let warnedMissing = false;
let cachedToken: { value: string; expiresAt: number } | null = null;

export function readCredentials(env: Record<string, string | undefined> = process.env): Credentials | null {
  const raw = env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (raw) {
    try {
      const text = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
      const json = JSON.parse(text) as { project_id?: string; client_email?: string; private_key?: string };
      if (json.project_id && json.client_email && json.private_key) {
        return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
      }
    } catch {
      // rơi xuống đọc bộ ba biến riêng
    }
  }
  const projectId = env.FIREBASE_PROJECT_ID;
  const clientEmail = env.FIREBASE_CLIENT_EMAIL;
  const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return projectId && clientEmail && privateKey ? { projectId, clientEmail, privateKey } : null;
}

export const isPushConfigured = () => readCredentials() !== null;

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

/** JWT ký RS256 để đổi lấy access token OAuth2 (luồng service account của Google). */
export function signServiceJwt(credentials: Credentials, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: credentials.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64url(signer.sign(credentials.privateKey))}`;
}

async function accessToken(credentials: Credentials) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signServiceJwt(credentials),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`OAuth token HTTP ${response.status}`);
  const body = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) throw new Error("OAuth token missing");
  cachedToken = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return body.access_token;
}

/** Token hết hạn / gỡ app: FCM trả 404 UNREGISTERED hoặc 400 INVALID_ARGUMENT cho token đó. */
function isDeadToken(status: number, body: string) {
  return status === 404 || (status === 400 && /registration token|INVALID_ARGUMENT/i.test(body)) || /UNREGISTERED/.test(body);
}

/** Gửi tới từng token, trả số tin gửi được và các token đã chết (để xóa khỏi DB). */
export async function sendToTokens(tokens: string[], data: PushData, options: { highPriority?: boolean } = {}) {
  const credentials = readCredentials();
  if (!credentials) {
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn("[FCM] Chưa cấu hình FIREBASE_SERVICE_ACCOUNT_JSON, bỏ qua thông báo đẩy.");
    }
    return { sent: 0, dead: [] as string[] };
  }
  const token = await accessToken(credentials);
  const url = `https://fcm.googleapis.com/v1/projects/${credentials.projectId}/messages:send`;
  const dead: string[] = [];
  let sent = 0;
  await Promise.all(
    tokens.map(async (target) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          body: JSON.stringify({
            message: {
              token: target,
              data,
              android: { priority: options.highPriority ? "high" : "normal", ttl: options.highPriority ? "3600s" : "86400s" },
            },
          }),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          cache: "no-store",
        });
        if (response.ok) {
          sent++;
          return;
        }
        const text = await response.text();
        if (isDeadToken(response.status, text)) dead.push(target);
        else console.warn("[FCM] gửi lỗi", { status: response.status, body: text.slice(0, 200) });
      } catch (error) {
        console.warn("[FCM] gửi lỗi mạng", { message: error instanceof Error ? error.message : String(error) });
      }
    }),
  );
  return { sent, dead };
}

/** Gửi tới mọi máy đang đăng nhập của bệnh nhân. Không bao giờ ném lỗi. */
export async function pushToPatient(patientId: string, data: PushData, options: { highPriority?: boolean } = {}) {
  try {
    if (!isPushConfigured()) return sendToTokens([], data, options);
    const rows = await db
      .select({ token: appSessions.fcmToken })
      .from(appSessions)
      .where(and(eq(appSessions.patientId, patientId), isNull(appSessions.revokedAt), isNotNull(appSessions.fcmToken)));
    const tokens = [...new Set(rows.flatMap((row) => (row.token ? [row.token] : [])))];
    if (tokens.length === 0) return { sent: 0, dead: [] };
    const result = await sendToTokens(tokens, data, options);
    if (result.dead.length > 0) {
      await db.update(appSessions).set({ fcmToken: null }).where(inArray(appSessions.fcmToken, result.dead));
    }
    return result;
  } catch (error) {
    console.error("[FCM] pushToPatient lỗi", { message: error instanceof Error ? error.message : String(error) });
    return { sent: 0, dead: [] };
  }
}
