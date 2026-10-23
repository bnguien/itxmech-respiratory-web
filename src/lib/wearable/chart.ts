// Gộp bản ghi phút thành điểm biểu đồ cho trang bác sĩ (hàm thuần, test không cần DB).

export type WearableRange = "6h" | "24h" | "7d" | "30d";

/**
 * Độ dài và kích thước nhóm của mỗi khoảng xem. Dữ liệu gốc là bản ghi mỗi phút từ vòng:
 * 6 giờ vẽ từng phút, 24 giờ nhóm 15 phút, 7 ngày nhóm 3 giờ, 30 ngày nhóm 1 ngày.
 * `tickSeconds`: khoảng giữa hai nhãn trục X.
 */
export const RANGE_SPEC: Record<WearableRange, { hours: number; bucketSeconds: number; tickSeconds: number; label: string; note: string }> = {
  "6h": { hours: 6, bucketSeconds: 60, tickSeconds: 3600, label: "6 giờ", note: "Mỗi điểm là 1 phút" },
  "24h": { hours: 24, bucketSeconds: 15 * 60, tickSeconds: 3 * 3600, label: "24 giờ", note: "Mỗi điểm là trung bình 15 phút" },
  "7d": { hours: 7 * 24, bucketSeconds: 3 * 3600, tickSeconds: 24 * 3600, label: "7 ngày", note: "Mỗi điểm là trung bình 3 giờ" },
  "30d": { hours: 30 * 24, bucketSeconds: 24 * 3600, tickSeconds: 5 * 24 * 3600, label: "30 ngày", note: "Mỗi điểm là trung bình 1 ngày" },
};

export const WEARABLE_RANGES = (Object.keys(RANGE_SPEC) as WearableRange[]).map((id) => ({ id, label: RANGE_SPEC[id].label }));

export const isWearableRange = (value: unknown): value is WearableRange =>
  typeof value === "string" && value in RANGE_SPEC;

export type Spo2Status = "normal" | "warning";

/** Một điểm biểu đồ. value null: nhóm không có số đo (mất kết nối, không đeo), biểu đồ để trống đoạn đó. */
export interface Spo2ChartPoint {
  /** Đầu nhóm, epoch mili giây. */
  t: number;
  value: number | null;
  min: number | null;
  status: Spo2Status;
}

const TZ = "Asia/Ho_Chi_Minh";
const VN_OFFSET_SECONDS = 7 * 3600;
/** Câu SQL gộp nhóm cộng độ lệch này trước khi chia, để nhóm khớp với chartWindow. */
export const BUCKET_OFFSET_SECONDS = VN_OFFSET_SECONDS;
const timeFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false });
const dayFormat = new Intl.DateTimeFormat("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit" });

/** Nhãn trục X: giờ cho 6 giờ / 24 giờ (thêm ngày ở mốc 00:00), ngày cho 7 / 30 ngày. */
export function tickLabel(ms: number, range: WearableRange): string {
  const at = new Date(ms);
  if (range === "6h" || range === "24h") {
    const time = timeFormat.format(at);
    return time === "00:00" ? dayFormat.format(at) : time;
  }
  return dayFormat.format(at);
}

/** Nhãn trong tooltip: đủ ngày giờ để không nhầm hôm nay với hôm qua. */
export function pointLabel(ms: number, range: WearableRange): string {
  const at = new Date(ms);
  if (range === "30d") return dayFormat.format(at);
  return `${timeFormat.format(at)} · ${dayFormat.format(at)}`;
}

/** Mốc nhãn trục X: tròn giờ / tròn ngày theo giờ Việt Nam. */
export function chartTicks(startMs: number, endMs: number, range: WearableRange): number[] {
  const step = RANGE_SPEC[range].tickSeconds * 1000;
  const offset = VN_OFFSET_SECONDS * 1000;
  const first = Math.ceil((startMs + offset) / step) * step - offset;
  const ticks: number[] = [];
  for (let t = first; t <= endMs; t += step) ticks.push(t);
  return ticks;
}

/** Khoảng thời gian của biểu đồ: từ đầu nhóm chứa (now - hours) tới hết nhóm hiện tại. */
export function chartWindow(range: WearableRange, nowMs: number) {
  const { hours, bucketSeconds } = RANGE_SPEC[range];
  const bucketMs = bucketSeconds * 1000;
  // Nhóm tính theo giờ Việt Nam (nhóm ngày bắt đầu 00:00, nhóm 3 giờ ở 00, 03, 06…), khớp BUCKET_OFFSET_SECONDS trong SQL.
  const offset = VN_OFFSET_SECONDS * 1000;
  const end = Math.floor((nowMs + offset) / bucketMs) * bucketMs - offset;
  const start = Math.floor((nowMs - hours * 3600 * 1000 + offset) / bucketMs) * bucketMs - offset;
  return { start, end, bucketMs };
}

export interface BucketRow {
  bucket: Date;
  mean: number | null;
  min: number | null;
}

/**
 * Lưới điểm đều theo thời gian từ đầu khoảng xem tới hiện tại. Nhóm không có SpO₂ hợp lệ vẫn có điểm với value null,
 * nên biểu đồ đứt đoạn đúng chỗ mất dữ liệu thay vì nối thẳng qua hoặc vẽ số 0 giả. Nhóm có SpO₂ thấp nhất dưới T tô đỏ.
 */
export function toChartPoints(rows: BucketRow[], range: WearableRange, T: number, nowMs = Date.now()): Spo2ChartPoint[] {
  const { start, end, bucketMs } = chartWindow(range, nowMs);
  const byBucket = new Map<number, BucketRow>();
  for (const row of rows) if (row.mean !== null) byBucket.set(Math.floor(row.bucket.getTime() / 1000) * 1000, row);
  const points: Spo2ChartPoint[] = [];
  for (let t = start; t <= end; t += bucketMs) {
    const row = byBucket.get(t);
    if (!row || row.mean === null) {
      points.push({ t, value: null, min: null, status: "normal" });
      continue;
    }
    const value = Math.round(row.mean * 10) / 10;
    const min = row.min !== null ? Math.round(row.min * 10) / 10 : value;
    points.push({ t, value, min, status: min < T ? "warning" : "normal" });
  }
  return points;
}

/** Tóm tắt các điểm có số đo; null khi cả khoảng không có dữ liệu. */
export function summarizeChart(points: Spo2ChartPoint[]) {
  const valid = points.filter((p): p is Spo2ChartPoint & { value: number } => p.value !== null);
  if (valid.length === 0) return null;
  const values = valid.map((p) => p.value);
  return {
    current: values.at(-1)!,
    average: values.reduce((total, value) => total + value, 0) / values.length,
    highest: Math.max(...values),
    lowest: Math.min(...valid.map((p) => p.min ?? p.value)),
  };
}

export const hasChartData = (points: Spo2ChartPoint[]) => points.some((p) => p.value !== null);

/**
 * Trục Y: luôn tới 100 %, đáy làm tròn xuống theo bước nhãn và không cao hơn 90 % để vẫn thấy vùng nguy hiểm.
 * Khoảng hẹp chia 2 %, khoảng rộng chia 5 %.
 */
export function spo2Axis(points: Spo2ChartPoint[], thresholds: number[]) {
  const lows = points.flatMap((p) => (p.value === null ? [] : [p.min ?? p.value]));
  const lowest = Math.min(90, ...thresholds, ...lows);
  const step = 100 - lowest > 14 ? 5 : 2;
  const floor = Math.max(50, Math.floor((lowest - 1) / step) * step);
  const ticks: number[] = [];
  for (let v = floor; v <= 100; v += step) ticks.push(v);
  if (ticks.at(-1) !== 100) ticks.push(100);
  return { domain: [floor, 100] as [number, number], ticks };
}
