import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";
import {
  bleConfigHex,
  DEFAULT_THRESHOLDS,
  defaultStoredConfig,
  thresholdsInt8,
  toConfigV1,
  validateThresholds,
} from "@/lib/monitoring/config";
import { toChartPoints } from "@/lib/wearable/chart";

describe("validateThresholds", () => {
  it("nhận sửa một phần, giữ các trường còn lại", () => {
    const result = validateThresholds({ T: 90, crit_T: 86 }, DEFAULT_THRESHOLDS);
    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({ T: 90, crit_T: 86, hr_low: 40, hr_high: 140, ml_enabled: true });
  });

  it("từ chối giống firmware (CONFIG_VA_API.md §3.2)", () => {
    expect(validateThresholds({ T: 96 }).error).toBeDefined();
    expect(validateThresholds({ T: 88, crit_T: 88 }).error).toBeDefined();
    expect(validateThresholds({ crit_n_min: 11 }).error).toBeDefined();
    expect(validateThresholds({ hr_low: 25 }).error).toBeDefined();
    expect(validateThresholds({ hr_low: 60, hr_high: 50 }).error).toBeDefined();
    expect(validateThresholds({ alert_k: 3, alert_n: 2 }).error).toBeDefined();
    expect(validateThresholds({ alert_cooldown: 2 }).error).toBeDefined();
    expect(validateThresholds({ hr_low: 0, hr_high: 0 }).error).toBeUndefined();
  });

  it("Watch và Alert dùng chung k/n như gói BLE 16 byte", () => {
    const result = validateThresholds({ alert_k: 2, alert_n: 3 });
    expect(result.data).toMatchObject({ watch_k: 2, watch_n: 3, alert_k: 2, alert_n: 3 });
  });
});

describe("config.v1 cho app", () => {
  it("ngưỡng INT8 khớp bảng spo2_tc_params.h của firmware", () => {
    expect(thresholdsInt8(88)).toEqual({ watch: 71, alert: 86 });
    expect(thresholdsInt8(90)).toEqual({ watch: 87, alert: 101 });
    expect(thresholdsInt8(95)).toEqual({ watch: 110, alert: 117 });
  });

  it("đánh dấu đã áp dụng khi vòng báo version >= version đang đặt", () => {
    const stored = { ...defaultStoredConfig(), version: 3 };
    const body = toConfigV1(stored, { deviceId: "WB-C3-0001", assignmentId: 7, appliedVersion: 2 });
    expect(body).toMatchObject({ version: 3, T: 88, thr_q: { watch: 71, alert: 86 }, applied_on_device: false });
    expect(body.critical).toEqual({ crit_T: 85, n_min: 3, sqi_min: 0.5, hr_low: 40, hr_high: 140, cooldown: 30 });
    expect(toConfigV1(stored, { deviceId: null, assignmentId: null, appliedVersion: 3 }).applied_on_device).toBe(true);
  });

  it("ble_config_hex cho vòng chạy WiFi khớp gói CONFIG mẫu ở ble-gatt.md 3.7", () => {
    // T = 88, version 9, HR 45–120: đúng 16 byte test firmware (tests/host/test_ble_proto.c) dùng.
    const stored = { ...defaultStoredConfig(), version: 9, thresholds: { ...DEFAULT_THRESHOLDS, hr_low: 45, hr_high: 120 } };
    expect(bleConfigHex(stored)).toBe("0900585503322d780147560101" + "3c0a1e");
    // ML tắt: ngưỡng INT8 127 / 127 như app gửi khi không có ngưỡng model.
    const noMl = { ...stored, version: 2, thresholds: { ...stored.thresholds, T: 90, hr_low: 40, hr_high: 140, ml_enabled: false } };
    expect(bleConfigHex(noMl)).toBe("02005a550332288c007f7f01013c0a1e");
  });
});

describe("biểu đồ SpO₂ trang bác sĩ", () => {
  it("bỏ nhóm không có số đo, tô đỏ nhóm dưới T", () => {
    const points = toChartPoints(
      [
        { bucket: new Date("2026-10-23T01:00:00Z"), mean: 95.44, min: 94 },
        { bucket: new Date("2026-10-23T01:15:00Z"), mean: null, min: null },
        { bucket: new Date("2026-10-23T01:30:00Z"), mean: 89, min: 86 },
      ],
      "24h",
      88,
    );
    expect(points.map((p) => [p.time, p.value, p.status])).toEqual([
      ["08:00", 95.4, "normal"],
      ["08:30", 89, "warning"],
    ]);
  });
});

describe("migration 0011", () => {
  it("mỗi bệnh nhân một chuỗi version, T trong 85–95", async () => {
    const db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE TABLE public.doctor_profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
      CREATE TABLE public.patients (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
    `);
    const sql = readFileSync(new URL("../drizzle/0011_monitoring_configs.sql", import.meta.url), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) if (statement.trim()) await db.exec(statement);

    const { rows } = await db.query<{ id: string }>("INSERT INTO patients DEFAULT VALUES RETURNING id");
    const insert = (version: number, t: number) =>
      db.query(
        `INSERT INTO monitoring_configs (patient_id, version, threshold_t, crit_t, crit_n_min, crit_sqi, hr_low, hr_high, ml_enabled,
           watch_k, watch_n, watch_cooldown, alert_k, alert_n, alert_cooldown, crit_cooldown, upload_interval_min)
         VALUES ($1, $2, $3, 85, 3, 0.5, 40, 140, true, 1, 1, 30, 1, 1, 60, 30, 10)`,
        [rows[0].id, version, t],
      );
    await insert(1, 88);
    await expect(insert(1, 90)).rejects.toThrow();
    await expect(insert(2, 99)).rejects.toThrow();
    await insert(2, 90);
    await db.close();
  }, 60_000);
});
