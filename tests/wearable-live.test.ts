import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import { buildLiveSnapshot, WARMING_UP_SUMMARY } from "@/lib/app-api/live";
import { validateDiagnostics, validateLive } from "@/lib/app-api/validation";
import { formatClockSeconds, pickCurrentReading, summarizeDiagnostics } from "@/lib/wearable/presentation";
import type { DeviceDiagnostic } from "@/types/wearable";

const NOW = 1_792_312_200;
const minute = (ts: number, spo2: number | null) => ({ ts, spo2_mean: spo2, spo2_min: spo2, pulse_mean: 80, worn: true });
const live = (ts: number, spo2: number | null) => ({ ts, spo2, spo2_min: spo2, pulse: 78, worn: true });

describe("số hiện tại giống nhau ở mọi máy", () => {
  it("lấy số 15 giây nếu đo sau cuối phút, ngược lại lấy bản ghi phút", () => {
    // Phút bắt đầu NOW-90 kết thúc NOW-30; số 15 giây đo lúc NOW-5 mới hơn.
    expect(pickCurrentReading(live(NOW - 5, 95), minute(NOW - 90, 93))).toMatchObject({ source: "live", spo2: 95 });
    // Số 15 giây cũ (app gateway đã thôi gửi) không đè bản ghi phút mới hơn gửi qua WiFi.
    expect(pickCurrentReading(live(NOW - 900, 95), minute(NOW - 120, 91))).toMatchObject({
      source: "minute",
      spo2: 91,
      ts: NOW - 60,
    });
    expect(pickCurrentReading(null, null)).toBeNull();
  });

  it("đang nhận qua BLE: giữ mức của vòng và trả số kèm giờ đo", () => {
    const s = buildLiveSnapshot({
      live: live(NOW - 5, 95),
      minute: minute(NOW - 90, 93),
      assessmentLevel: "WATCH",
      device: { ts: NOW - 5, transport: "ble_relay", worn: true },
      nowSeconds: NOW,
    });
    expect(s).toMatchObject({ state: "WATCH", fresh: true, reading: { spo2: 95, ts: NOW - 5 } });
    expect(s.connection.kind).toBe("live");
  });

  it("60 phút đầu (chưa có mức) mà đang nhận số: không ghi \"chưa nhận được dữ liệu\"", () => {
    const s = buildLiveSnapshot({
      live: live(NOW - 5, 88.1),
      minute: minute(NOW - 90, 88),
      assessmentLevel: "UNKNOWN",
      device: { ts: NOW - 5, transport: "ble_relay", worn: true },
      nowSeconds: NOW,
    });
    expect(s).toMatchObject({ state: "UNKNOWN", fresh: true, summary: WARMING_UP_SUMMARY });
  });

  it("mất kết nối: không giữ mức Bình thường cũ, nói rõ không nhận được SpO₂", () => {
    const s = buildLiveSnapshot({
      live: live(NOW - 600, 95),
      minute: minute(NOW - 660, 95),
      assessmentLevel: "NORMAL",
      device: { ts: NOW - 600, transport: "ble_relay", worn: true },
      nowSeconds: NOW,
    });
    expect(s.fresh).toBe(false);
    expect(s.state).toBe("UNKNOWN");
    expect(s.connection.kind).toBe("interrupted");
    expect(s.summary).toContain("không nhận được SpO₂");

    const lost = buildLiveSnapshot({ ...{ live: null, minute: minute(NOW - 7200, 95) }, assessmentLevel: "ALERT",
      device: { ts: NOW - 7200, transport: "ble_relay", worn: true }, nowSeconds: NOW });
    expect(lost).toMatchObject({ state: "UNKNOWN", fresh: false });
    expect(lost.connection.kind).toBe("lost");
  });

  it("WiFi dự phòng đúng nhịp: vẫn là số hiện tại, ghi rõ cập nhật chậm", () => {
    const s = buildLiveSnapshot({
      live: null,
      minute: minute(NOW - 8 * 60, 94),
      assessmentLevel: "NORMAL",
      device: { ts: NOW - 7 * 60, transport: "wifi", worn: true },
      uploadIntervalMin: 10,
      nowSeconds: NOW,
    });
    expect(s).toMatchObject({ state: "NORMAL", fresh: true });
    expect(s.summary).toContain("WiFi dự phòng");
  });

  it("giờ đo có giây để đối chiếu giữa các máy", () => {
    expect(formatClockSeconds(NOW + 15)).toBe("15:30:15");
  });
});

describe("validateLive", () => {
  it("nhận số 15 giây, kẹp tỷ lệ về 0–1, từ chối khi vòng chưa có giờ", () => {
    const body = { device_id: "WB-C3-0001", ts: NOW, spo2: 95.2, spo2_min: 93, pulse: 72, sqi: 1.2, valid: 0.93, worn: true };
    expect(validateLive(body).data).toMatchObject({ spo2: 95.2, sqi: 1, valid: 0.93, worn: true });
    expect(validateLive({ ...body, spo2: null, pulse: null }).data?.spo2).toBeNull();
    expect(validateLive({ ...body, ts: 1200 }).error).toBeDefined();
    expect(validateLive({ ...body, spo2: "95" }).error).toBeDefined();
  });
});

describe("validateDiagnostics", () => {
  const item = {
    ts: NOW, uptime_s: 4500, boot_id: 7, cpu_avg_pct: 2.3, cpu_peak_pct: 11, model_ms: null, minute_ms: 3.2,
    flash_ms: 0.8, heap_min_kb: 61, wifi_s: 9, reset_reason: "BROWNOUT", ble_drops: 0,
  };
  it("nhận mục hợp lệ, mục chưa có giờ lấy giờ server, lý do reset lạ thành UNKNOWN", () => {
    const parsed = validateDiagnostics({ device_id: "WB-C3-0001", transport: "wifi", items: [item] }, NOW);
    expect(parsed.data).toMatchObject({ transport: "wifi", items: [{ model_ms: null, reset_reason: "BROWNOUT" }] });
    const early = validateDiagnostics({ device_id: "WB-C3-0001", items: [{ ...item, ts: 300, reset_reason: "x" }] }, NOW);
    expect(early.data?.items[0]).toMatchObject({ ts: NOW, reset_reason: "UNKNOWN" });
    expect(validateDiagnostics({ device_id: "WB-C3-0001", items: [{ ...item, uptime_s: -1 }] }).error).toBeDefined();
  });

  it("tóm tắt: đỉnh CPU trên 85% là quá tải, đếm số lần khởi động lại", () => {
    const d = (boot: number, peak: number): DeviceDiagnostic => ({
      ts: NOW, boot_id: boot, uptime_s: 300, cpu_avg_pct: 3, cpu_peak_pct: peak, model_ms: 18, minute_ms: 20,
      flash_ms: 1, heap_min_kb: 60, wifi_s: 0, reset_reason: "POWERON", ble_drops: 0, transport: "ble_relay",
    });
    expect(summarizeDiagnostics([d(1, 9), d(1, 12)])).toMatchObject({ cpuPeak: 12, overloaded: false, resets: 0, modelMax: 18 });
    expect(summarizeDiagnostics([d(1, 9), d(2, 90)])).toMatchObject({ overloaded: true, resets: 1 });
  });
});

describe("migration 0014", () => {
  it("một dòng số 15 giây mỗi vòng, DIAG không trùng khi gửi lại, wearable_live có Realtime", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE public.doctor_profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
      CREATE TABLE public.patients (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
      CREATE TABLE public.wearable_devices (device_id text PRIMARY KEY);
    `);
    const sql = readFileSync(new URL("../drizzle/0014_wearable_live_and_diagnostics.sql", import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) if (statement.trim()) await db.exec(statement);

    const { rows } = await db.query<{ id: string }>("INSERT INTO patients DEFAULT VALUES RETURNING id");
    await db.query("INSERT INTO wearable_devices VALUES ('WB-1')");
    const upsert = (ts: string, spo2: number) =>
      db.query(
        `INSERT INTO wearable_live (device_id, patient_id, ts, spo2, valid, worn, transport)
         VALUES ('WB-1', $1, $2, $3, 1, true, 'ble_relay')
         ON CONFLICT (device_id) DO UPDATE SET ts = excluded.ts, spo2 = excluded.spo2 WHERE wearable_live.ts <= excluded.ts`,
        [rows[0].id, ts, spo2],
      );
    await upsert("2026-10-23T10:00:15Z", 95);
    await upsert("2026-10-23T10:00:30Z", 94);
    await upsert("2026-10-23T10:00:00Z", 99);   // gói đến trễ: không đè số mới hơn
    const current = await db.query<{ spo2: number }>("SELECT spo2 FROM wearable_live");
    expect(current.rows).toEqual([{ spo2: 94 }]);

    const diag = `INSERT INTO device_diagnostics (device_id, boot_id, uptime_s, patient_id, ts, reset_reason, transport)
      VALUES ('WB-1', 3, 300, $1, now(), 'POWERON', 'wifi') ON CONFLICT DO NOTHING RETURNING uptime_s`;
    expect((await db.query(diag, [rows[0].id])).rows).toHaveLength(1);
    expect((await db.query(diag, [rows[0].id])).rows).toHaveLength(0);

    const pub = await db.query("SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wearable_live'");
    expect(pub.rows).toHaveLength(1);
    await db.close();
  }, 60_000);
});
