export type LungSound =
  | "Normal"
  | "Crackles"
  | "Wheezes"
  | "Crackles + Wheezes";
export type ReviewStatus = "pending_review" | "confirmed";
export type VisitStage =
  | "waiting"
  | "receiving"
  | "received"
  | "analyzing"
  | "ready"
  | "review"
  | "confirmed";

export interface RespiratoryCycle {
  id: string;
  number: number;
  start: number;
  end: number;
  classification: LungSound;
  confidence: number;
}

export interface Recording {
  id: string;
  patientId: string;
  patientName: string;
  patientCode: string;
  recordedAt: string;
  duration: number;
  classification: LungSound;
  confidence: number;
  status: ReviewStatus;
  deviceId: string;
  audioUrl?: string;
  cycles: RespiratoryCycle[];
  note?: string;
}

export interface Visit {
  id: string;
  patientId: string;
  startedAt: string;
  doctor: string;
  spo2: number;
  status: "completed" | "in_progress";
  recordingId?: string;
  result?: LungSound;
  note?: string;
}

export interface Patient {
  id: string;
  code: string;
  name: string;
  age: number;
  gender: "Nam" | "Nữ" | "Khác";
  phone: string;
  diagnosis: string;
  spo2: number;
  sound: LungSound;
  confidence: number;
  needsAttention: boolean;
  visits: Visit[];
}

export interface ClinicalAlert {
  id: string;
  patientId?: string;
  patientName?: string;
  patientCode?: string;
  type: "spo2" | "sound" | "review" | "device";
  message: string;
  time: string;
  severity: "critical" | "warning" | "info";
  unread: boolean;
}

export interface Device {
  id: string;
  type: "stetho" | "spo2";
  patientId: string;
  patientName: string;
  online: boolean;
  battery: number;
  lastActive: string;
  firmware: string;
}
