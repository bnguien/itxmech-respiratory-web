import type { CycleLabel, AnalysisStatus } from "./analysis";

export interface RecordingCatalogItem {
  id: string;
  visit_id: string;
  patient_id: string;
  patient_name: string;
  patient_code: string;
  date_of_birth: string;
  gender: string;
  phone: string | null;
  visit_started_at: string;
  uploaded_at: string | null;
  duration_ms: number | null;
  analysis_status: AnalysisStatus;
  labels: CycleLabel[];
  cycle_count: number;
  reviewed_count: number;
}

export interface RecordingCatalogResponse {
  data: RecordingCatalogItem[];
  pagination: { page: number; total: number; total_pages: number };
}
