// Xếp hạng bệnh nhân cần chú ý trên dashboard (hàm thuần, test không cần DB).
import type { CycleLabel } from "@/types/analysis";
import type { WearableLevel } from "@/types/wearable";

export interface DashboardPatient {
  id: string;
  code: string;
  name: string;
  diagnosis: string | null;
  /** SpO₂ phút gần nhất trong 30 phút qua; null nếu không có. */
  spo2: number | null;
  level: WearableLevel;
  T: number;
  last_seen: string | null;
  sound: CycleLabel | null;
  needs_attention: boolean;
  reason: string | null;
}

export interface DashboardOverview {
  totals: { attention: number; spo2_low: number; pending_recordings: number; monitored: number };
  patients: DashboardPatient[];
  focus_patient: { id: string; name: string } | null;
}

const SEVERITY: Record<WearableLevel, number> = { CRITICAL: 4, ALERT: 3, WATCH: 2, UNKNOWN: 0, NORMAL: 0 };

export interface PatientSignal {
  id: string;
  code: string;
  name: string;
  diagnosis: string | null;
  spo2: number | null;
  level: WearableLevel | null;
  T: number;
  lastSeen: string | null;
  sound: CycleLabel | null;
}

/** Cần chú ý: vòng báo Watch/Alert/Critical trong giờ qua, SpO₂ dưới T, hoặc âm phổi bất thường gần nhất. */
export function classify(p: PatientSignal): DashboardPatient {
  const level = p.level ?? "UNKNOWN";
  const below = p.spo2 !== null && p.spo2 < p.T;
  const abnormalSound = p.sound !== null && p.sound !== "normal";
  const reason =
    SEVERITY[level] >= 2 ? `Vòng báo mức ${level}` : below ? `SpO₂ dưới ngưỡng ${p.T}%` : abnormalSound ? "Âm phổi bất thường" : null;
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    diagnosis: p.diagnosis,
    spo2: p.spo2,
    level,
    T: p.T,
    last_seen: p.lastSeen,
    sound: p.sound,
    needs_attention: reason !== null,
    reason,
  };
}

/** Nặng trước: mức vòng, rồi SpO₂ thấp hơn ngưỡng nhiều nhất, rồi âm phổi; bệnh nhân không có dữ liệu xếp cuối. */
export function rankPatients(list: DashboardPatient[]): DashboardPatient[] {
  const score = (p: DashboardPatient) =>
    SEVERITY[p.level] * 1000 + (p.spo2 !== null ? Math.max(0, p.T - p.spo2) * 10 : 0) + (p.sound && p.sound !== "normal" ? 5 : 0) +
    (p.spo2 !== null ? 1 : 0);
  return [...list].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, "vi"));
}
