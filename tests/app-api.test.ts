import { describe, expect, it } from "vitest";
import {
  generateAccessCode,
  hashAccessCode,
  hashRefreshToken,
  signAccessToken,
  verifyAccessCode,
  verifyAccessToken,
} from "@/lib/app-api/crypto";
import { liveLevel, STALE_AFTER_MS } from "@/lib/app-api/live";
import {
  parseVitalsRange,
  validateAssessments,
  validateLogin,
  validateTelemetry,
} from "@/lib/app-api/validation";

const SECRET = "test-secret-test-secret-test-secret-123";

describe("mã truy cập app", () => {
  it("sinh 6 chữ số, không phải mã dễ đoán", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateAccessCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code).not.toMatch(/^(\d)\1{5}$/);
    }
  });

  it("hash scrypt kiểm tra đúng và sai", async () => {
    const hash = await hashAccessCode("482913");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(hash).not.toContain("482913");
    await expect(verifyAccessCode("482913", hash)).resolves.toBe(true);
    await expect(verifyAccessCode("482914", hash)).resolves.toBe(false);
    await expect(verifyAccessCode("482913", "bcrypt$x$y")).resolves.toBe(false);
  });

  it("refresh token chỉ lưu SHA-256", () => {
    expect(hashRefreshToken("abc")).toBe(hashRefreshToken("abc"));
    expect(hashRefreshToken("abc")).not.toBe(hashRefreshToken("abd"));
  });
});

describe("access token", () => {
  it("ký và kiểm tra, hết hạn sau 1 giờ", () => {
    const token = signAccessToken("session-1", "patient-1", 1_000_000, SECRET);
    expect(verifyAccessToken(token, 1_000_100, SECRET)).toMatchObject({ sub: "session-1", pid: "patient-1" });
    expect(verifyAccessToken(token, 1_000_000 + 3600, SECRET)).toBeNull();
  });

  it("từ chối chữ ký sai hoặc payload bị sửa", () => {
    const token = signAccessToken("session-1", "patient-1", 1_000_000, SECRET);
    expect(verifyAccessToken(token, 1_000_100, "another-secret-another-secret-12345")).toBeNull();
    const [h, , s] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ sub: "x", pid: "y", iat: 0, exp: 9e9 })).toString("base64url");
    expect(verifyAccessToken(`${h}.${forged}.${s}`, 1_000_100, SECRET)).toBeNull();
    expect(verifyAccessToken("not-a-token", 1_000_100, SECRET)).toBeNull();
  });
});

describe("validateLogin", () => {
  const ok = {
    patient_code: "pat-000012",
    access_code: "482913",
    viewer_name: " Lan ",
    role: "FAMILY",
    is_ble_gateway: true,
    app_install_id: "install-1",
  };

  it("chuẩn hóa mã bệnh nhân, tên, vai trò", () => {
    const result = validateLogin(ok);
    expect(result.error).toBeUndefined();
    expect(result.data).toMatchObject({
      patient_code: "PAT-000012",
      viewer_name: "Lan",
      role: "family",
      is_ble_gateway: true,
      fcm_token: null,
    });
  });

  it("báo lỗi định dạng", () => {
    expect(validateLogin({ ...ok, patient_code: "000012" }).error).toBeDefined();
    expect(validateLogin({ ...ok, access_code: "12345" }).error).toBeDefined();
    expect(validateLogin({ ...ok, viewer_name: "" }).error).toBeDefined();
    expect(validateLogin({ ...ok, role: "admin" }).error).toBeDefined();
    expect(validateLogin(null).error).toBeDefined();
  });
});

describe("validateTelemetry", () => {
  const sample = (seq: number, ts = 1_792_137_600 + seq * 60) => ({
    seq, ts, spo2_mean: 95.4, spo2_min: 94, spo2_valid: 0.97, pulse_mean: 78, sqi: 0.91, worn: true,
  });

  it("nhận lô hợp lệ, null giữ nguyên", () => {
    const result = validateTelemetry({
      device_id: "WB-C3-0001",
      boot_id: 3,
      samples: [sample(1), { ...sample(2), spo2_mean: null, pulse_mean: null }],
    });
    expect(result.data?.samples).toHaveLength(2);
    expect(result.data?.samples[1].spo2_mean).toBeNull();
    expect(result.data?.transport).toBe("ble_relay");
    expect(result.data?.max_seq).toBe(2);
  });

  it("bỏ bản ghi chưa có giờ thật nhưng vẫn tính vào max_seq", () => {
    const result = validateTelemetry({ device_id: "WB-C3-0001", samples: [sample(5, 1234), sample(6)] });
    expect(result.data?.samples.map((s) => s.seq)).toEqual([6]);
    expect(result.data?.max_seq).toBe(6);
  });

  it("từ chối device_id lạ, lô quá lớn, giá trị không phải số", () => {
    expect(validateTelemetry({ device_id: "a b", samples: [] }).error).toBeDefined();
    expect(validateTelemetry({ device_id: "WB-1", samples: Array.from({ length: 121 }, (_, i) => sample(i)) }).error).toBeDefined();
    expect(validateTelemetry({ device_id: "WB-1", samples: [{ ...sample(1), spo2_mean: "95" }] }).error).toBeDefined();
  });
});

describe("validateAssessments", () => {
  it("nhận item hợp lệ, từ chối level lạ", () => {
    const item = {
      seq: 10, ts: 1_792_137_660, level: "ALERT", trigger: "ml_risk",
      notify: { watch: false, alert: true, critical: false }, ran_model: true, out_q: 92, T: 88,
      spo2_now: 89.8, pulse_now: 96, local_notified: true, config_version: 0, model_version: "m",
    };
    expect(validateAssessments({ device_id: "WB-C3-0001", items: [item] }).data?.items[0].notify.alert).toBe(true);
    expect(validateAssessments({ device_id: "WB-C3-0001", items: [{ ...item, level: "BAD" }] }).error).toBeDefined();
  });
});

describe("GET /live và /vitals", () => {
  it("mất dữ liệu quá 15 phút thì UNKNOWN", () => {
    const now = Date.parse("2026-10-23T10:00:00Z");
    expect(liveLevel(null, "ALERT", now)).toBe("UNKNOWN");
    expect(liveLevel(new Date(now - STALE_AFTER_MS - 1000).toISOString(), "NORMAL", now)).toBe("UNKNOWN");
    expect(liveLevel(new Date(now - 60_000).toISOString(), "ALERT", now)).toBe("ALERT");
    expect(liveLevel(new Date(now - 60_000).toISOString(), null, now)).toBe("NORMAL");
  });

  it("kiểm tra khoảng thời gian và độ phân giải", () => {
    expect(parseVitalsRange("2026-10-22T00:00:00Z", "2026-10-23T00:00:00Z", "5m").data?.bucketSeconds).toBe(300);
    expect(parseVitalsRange("2026-10-23T00:00:00Z", "2026-10-22T00:00:00Z", "1m").error).toBeDefined();
    expect(parseVitalsRange("x", "2026-10-22T00:00:00Z", "1m").error).toBeDefined();
    expect(parseVitalsRange("2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z", "1h").error).toBeDefined();
    expect(parseVitalsRange("2026-10-22T00:00:00Z", "2026-10-23T00:00:00Z", "2m").error).toBeDefined();
  });
});
