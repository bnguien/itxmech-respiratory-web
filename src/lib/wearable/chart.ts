// Gộp bản ghi phút thành điểm biểu đồ cho trang bệnh nhân (hàm thuần, test không cần DB).
import type { Spo2ChartPoint } from "@/constants/spo2";

export type WearableRange = "24h" | "7d" | "30d";

/** Độ dài và kích thước nhóm của mỗi khoảng xem: 24 giờ nhóm 15 phút, 7 ngày nhóm 3 giờ, 30 ngày nhóm 1 ngày. */
export const RANGE_SPEC: Record<WearableRange, { hours: number; bucketSeconds: number }> = {
  "24h": { hours: 24, bucketSeconds: 15 * 60 },
  "7d": { hours: 7 * 24, bucketSeconds: 3 * 3600 },
  "30d": { hours: 30 * 24, bucketSeconds: 24 * 3600 },
};

export const isWearableRange = (value: unknown): value is WearableRange =>
  value === "24h" || value === "7d" || value === "30d";

const TZ = "Asia/Ho_Chi_Minh";
const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit" });

export function bucketLabel(at: Date, range: WearableRange): string {
  if (range === "24h") return timeFormat.format(at);
  if (range === "7d") return `${dayFormat.format(at)} ${timeFormat.format(at)}`;
  return dayFormat.format(at);
}

export interface BucketRow {
  bucket: Date;
  mean: number | null;
  min: number | null;
}

/** Nhóm không có SpO₂ hợp lệ bị bỏ (biểu đồ không vẽ số 0 giả). Điểm dưới T tô đỏ. */
export function toChartPoints(rows: BucketRow[], range: WearableRange, T: number): Spo2ChartPoint[] {
  return rows
    .filter((row) => row.mean !== null)
    .map((row) => {
      const value = Math.round(row.mean! * 10) / 10;
      const min = row.min ?? value;
      return { time: bucketLabel(row.bucket, range), value, min, status: min < T ? "warning" : "normal" };
    });
}
