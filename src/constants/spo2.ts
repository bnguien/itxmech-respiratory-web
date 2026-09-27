export const SPO2_WARNING_THRESHOLD = 90;

export type Spo2Status = "normal" | "warning";
export interface Spo2ChartPoint {
  time: string;
  value: number;
  status: Spo2Status;
}

export function getSpo2Status(value: number): Spo2Status {
  return value < SPO2_WARNING_THRESHOLD ? "warning" : "normal";
}

export function getSpo2StatusLabel(value: number) {
  return getSpo2Status(value) === "warning" ? "Thấp" : "Bình thường";
}

const values24h = [96, 95, 94, 94, 93, 93, 92, 91, 90, 89];
const labels24h = [
  "16:00",
  "19:00",
  "22:00",
  "01:00",
  "04:00",
  "07:00",
  "10:00",
  "12:30",
  "14:00",
  "15:30",
];

export const spo2DataByRange: Record<"24h" | "7d" | "30d", Spo2ChartPoint[]> = {
  "24h": values24h.map((value, index) => ({
    time: labels24h[index],
    value,
    status: getSpo2Status(value),
  })),
  "7d": [95, 94, 95, 93, 92, 91, 89].map((value, index) => ({
    time: `T${index + 2}`,
    value,
    status: getSpo2Status(value),
  })),
  "30d": [96, 95, 94, 95, 93, 94, 92, 91, 93, 90, 89].map((value, index) => ({
    time: `${index * 3 + 1}/09`,
    value,
    status: getSpo2Status(value),
  })),
};
