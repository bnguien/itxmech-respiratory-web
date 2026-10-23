import { generateKeyPairSync, createVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it, vi } from "vitest";
import { alertStatus, alertSummary, planAlert } from "@/lib/alerts/rules";
import { errorCode, isTransientDbError, withAppErrors } from "@/lib/app-api/http";
import { readCredentials, signServiceJwt } from "@/lib/push/fcm";

const T0 = Date.parse("2026-10-23T01:00:00Z");
const iso = (ms: number) => new Date(ms).toISOString();

describe("gộp cảnh báo từ assessment", () => {
  it("mở cảnh báo mới khi chưa có đợt nào hoặc đợt cũ đã qua 30 phút", () => {
    expect(planAlert(null, "ALERT", T0)).toBe("open");
    expect(planAlert({ level: "ALERT", acknowledgedAt: null, lastSeenAt: iso(T0 - 31 * 60_000) }, "ALERT", T0)).toBe("open");
  });

  it("cùng đợt thì chỉ dời mốc, kể cả khi bác sĩ đã xem (không báo lại mỗi phút)", () => {
    expect(planAlert({ level: "ALERT", acknowledgedAt: null, lastSeenAt: iso(T0 - 5 * 60_000) }, "ALERT", T0)).toBe("extend");
    expect(planAlert({ level: "CRITICAL", acknowledgedAt: iso(T0), lastSeenAt: iso(T0 - 60_000) }, "ALERT", T0)).toBe("extend");
  });

  it("ALERT lên CRITICAL thì nâng mức (gửi thông báo lại)", () => {
    expect(planAlert({ level: "ALERT", acknowledgedAt: iso(T0), lastSeenAt: iso(T0 - 60_000) }, "CRITICAL", T0)).toBe("escalate");
  });

  it("trạng thái và câu tóm tắt cho app", () => {
    expect(alertStatus({ acknowledgedAt: null, lastSeenAt: iso(T0) }, T0 + 60_000)).toBe("OPEN");
    expect(alertStatus({ acknowledgedAt: null, lastSeenAt: iso(T0) }, T0 + 40 * 60_000)).toBe("RESOLVED");
    expect(alertStatus({ acknowledgedAt: null, familyAckedAt: iso(T0), lastSeenAt: iso(T0) }, T0)).toBe("ACKNOWLEDGED");
    expect(alertSummary("CRITICAL", "rule_critical", 82.4, 121.6)).toBe("Nguy hiểm: SpO₂ dưới ngưỡng nguy hiểm (SpO₂ 82%, mạch 122)");
  });
});

describe("bọc lỗi route app", () => {
  it("lỗi DB tạm thời (kể cả bọc trong cause của Drizzle) trả 503 + Retry-After", async () => {
    const drizzleError = Object.assign(new Error("Failed query"), { cause: Object.assign(new Error("pool"), { code: "EMAXCONNSESSION" }) });
    expect(errorCode(drizzleError)).toBe("EMAXCONNSESSION");
    expect(isTransientDbError(drizzleError)).toBe(true);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const response = await withAppErrors("test", async () => {
      throw drizzleError;
    })();
    expect(response.status).toBe(503);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(await response.json()).toMatchObject({ error: { code: "SERVICE_UNAVAILABLE" } });
  });

  it("lỗi khác trả 500 đúng dạng {error}", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = await withAppErrors("test", async () => {
      throw new TypeError("boom");
    })();
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: { code: "INTERNAL_ERROR" } });
  });
});

describe("FCM", () => {
  it("đọc khóa tài khoản dịch vụ từ JSON, base64 hoặc ba biến riêng", () => {
    const json = JSON.stringify({ project_id: "p", client_email: "e@p.iam", private_key: "k" });
    expect(readCredentials({ FIREBASE_SERVICE_ACCOUNT_JSON: json })).toEqual({ projectId: "p", clientEmail: "e@p.iam", privateKey: "k" });
    expect(readCredentials({ FIREBASE_SERVICE_ACCOUNT_JSON: Buffer.from(json).toString("base64") })?.projectId).toBe("p");
    expect(
      readCredentials({ FIREBASE_PROJECT_ID: "p", FIREBASE_CLIENT_EMAIL: "e", FIREBASE_PRIVATE_KEY: "a\\nb" })?.privateKey,
    ).toBe("a\nb");
    expect(readCredentials({})).toBeNull();
  });

  it("ký JWT RS256 đúng chuẩn service account", () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const jwt = signServiceJwt({ projectId: "p", clientEmail: "svc@p.iam", privateKey: pem }, 1_800_000_000);
    const [header, claims, signature] = jwt.split(".");
    expect(JSON.parse(Buffer.from(claims, "base64url").toString())).toMatchObject({
      iss: "svc@p.iam",
      aud: "https://oauth2.googleapis.com/token",
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      exp: 1_800_003_600,
    });
    const verify = createVerify("RSA-SHA256");
    verify.update(`${header}.${claims}`);
    expect(verify.verify(publicKey, Buffer.from(signature, "base64url"))).toBe(true);
  });
});

describe("migration 0013", () => {
  it("tạo bảng wearable_alerts, chặn mức lạ, thêm vào Realtime", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.doctor_profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
      CREATE TABLE public.patients (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.wearable_devices (device_id text PRIMARY KEY);
    `);
    const sql = readFileSync(new URL("../drizzle/0013_wearable_alerts.sql", import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) if (statement.trim()) await db.exec(statement);

    const { rows } = await db.query<{ id: string }>("INSERT INTO patients DEFAULT VALUES RETURNING id");
    await db.query("INSERT INTO wearable_devices VALUES ('WB-1')");
    const insert = (level: string) =>
      db.query(
        "INSERT INTO wearable_alerts (patient_id, device_id, level, trigger, source_seq, opened_at, last_seen_at) VALUES ($1, 'WB-1', $2, 'rule_alert', 1, now(), now())",
        [rows[0].id, level],
      );
    await insert("CRITICAL");
    await expect(insert("WATCH")).rejects.toThrow();
    const pub = await db.query("SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wearable_alerts'");
    expect(pub.rows).toHaveLength(1);
  }, 30_000);
});
