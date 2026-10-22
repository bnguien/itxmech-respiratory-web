import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 giờ
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 ngày
const SCRYPT_KEYLEN = 32;

/** Mã truy cập 6 chữ số cho người nhà. Không dùng mã dễ đoán như 000000. */
export function generateAccessCode(): string {
  for (;;) {
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    if (!/^(\d)\1{5}$/.test(code) && code !== "123456" && code !== "654321") return code;
  }
}

/** Dạng lưu: `scrypt$<salt base64url>$<hash base64url>`. */
export async function hashAccessCode(code: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(code, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export async function verifyAccessCode(code: string, stored: string): Promise<boolean> {
  const [scheme, saltText, hashText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  const actual = await scrypt(code, Buffer.from(saltText, "base64url"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Refresh token ngẫu nhiên; DB chỉ giữ SHA-256 của nó. */
export function generateRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export interface AccessTokenClaims {
  sub: string; // app_sessions.id
  pid: string; // patients.id
  iat: number;
  exp: number;
}

function appJwtSecret(): string {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("APP_JWT_SECRET chưa được cấu hình (cần ít nhất 32 ký tự).");
  }
  return secret;
}

function hmac(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

/** JWT HS256 cho app. Chỉ server này ký và kiểm tra, nên không cần thư viện ngoài. */
export function signAccessToken(
  sessionId: string,
  patientId: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret = appJwtSecret(),
): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const claims: AccessTokenClaims = {
    sub: sessionId,
    pid: patientId,
    iat: nowSeconds,
    exp: nowSeconds + ACCESS_TOKEN_TTL_SECONDS,
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${header}.${payload}.${hmac(`${header}.${payload}`, secret)}`;
}

/** null nếu sai chữ ký, sai định dạng hoặc hết hạn. */
export function verifyAccessToken(
  token: string,
  nowSeconds = Math.floor(Date.now() / 1000),
  secret = appJwtSecret(),
): AccessTokenClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = Buffer.from(hmac(`${header}.${payload}`, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const head = JSON.parse(Buffer.from(header, "base64url").toString()) as { alg?: string };
    if (head.alg !== "HS256") return null;
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as AccessTokenClaims;
    if (typeof claims.sub !== "string" || typeof claims.pid !== "string" || typeof claims.exp !== "number") {
      return null;
    }
    return claims.exp > nowSeconds ? claims : null;
  } catch {
    return null;
  }
}
