import { describe, expect, it } from "vitest";
import {
  formatClock,
  wearableConnection,
  minutesUntilModelReady,
  probFromQ,
  riskThresholds,
  summarizeSamples,
} from "@/lib/wearable/presentation";
import type { TelemetrySample } from "@/types/wearable";

const sample = (spo2: number | null, index = 0): TelemetrySample => ({
  seq: index, ts: 1792312200 + index * 60, spo2_mean: spo2, spo2_min: spo2 === null ? null : spo2 - 1,
  spo2_valid: spo2 === null ? 0 : 1, pulse_mean: spo2 === null ? null : 80, sqi: 0.9, worn: spo2 !== null,
});

describe("wearable presentation", () => {
  it("đổi out_q sang xác suất giống spo2tc_prob trên firmware", () => {
    expect(probFromQ(125)).toBeCloseTo(0.5, 6);
    expect(probFromQ(86)).toBeCloseTo(0.155, 2); // ngưỡng Alert ở T = 88 (bảng meta: 0.1555)
  });

  it("ngưỡng Watch thấp hơn Alert và tăng theo T, kẹp trong 85–95", () => {
    const t88 = riskThresholds(88);
    expect(t88.watch).toBeLessThan(t88.alert);
    expect(riskThresholds(92).alert).toBeGreaterThan(t88.alert);
    expect(riskThresholds(80)).toEqual(riskThresholds(85));
  });

  it("bỏ qua phút mất tín hiệu khi tóm tắt", () => {
    const summary = summarizeSamples([sample(95, 0), sample(null, 1), sample(90, 2)]);
    expect(summary).toMatchObject({ current: 90, highest: 95, lowest: 89, validMinutes: 2 });
    expect(summarizeSamples([sample(null)])).toBeNull();
  });

  it("đếm số phút còn thiếu để model đủ cửa sổ 60 phút", () => {
    expect(minutesUntilModelReady(Array.from({ length: 45 }, (_, i) => sample(95, i)))).toBe(15);
    expect(minutesUntilModelReady(Array.from({ length: 90 }, (_, i) => sample(95, i)))).toBe(0);
  });

  it("hiển thị giờ Việt Nam", () => {
    expect(formatClock(1792312200)).toBe("15:30");
  });

  it("trạng thái kết nối vòng theo lần cuối nhận dữ liệu và đường truyền", () => {
    const now = 1792312200;
    expect(wearableConnection(null, now).kind).toBe("none");
    expect(wearableConnection({ ts: now - 40, transport: "ble_relay", worn: true }, now).kind).toBe("live");
    expect(wearableConnection({ ts: now - 40, transport: "ble_relay", worn: false }, now).kind).toBe("not_worn");
    // Mất app: chưa tới chu kỳ WiFi thì là gián đoạn, quá chu kỳ + 5 phút là mất kết nối.
    expect(wearableConnection({ ts: now - 5 * 60, transport: "ble_relay", worn: true }, now).kind).toBe("interrupted");
    expect(wearableConnection({ ts: now - 16 * 60, transport: "ble_relay", worn: true }, now).kind).toBe("lost");
    // Vòng tự gửi qua WiFi mỗi 10 phút: 12 phút chưa có gì vẫn là bình thường của chế độ WiFi.
    expect(wearableConnection({ ts: now - 12 * 60, transport: "wifi", worn: true }, now, 10).kind).toBe("wifi");
    expect(wearableConnection({ ts: now - 40 * 60, transport: "wifi", worn: true }, now, 10).kind).toBe("lost");
  });
});
