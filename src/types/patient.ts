export type PatientGender = "male" | "female" | "other";

export interface PatientRecord {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string;
  gender: PatientGender;
  phone: string | null;
  background_diagnosis: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
}

export interface PatientInput {
  full_name: string;
  date_of_birth: string;
  gender: PatientGender;
  phone?: string | null;
  background_diagnosis?: string | null;
}

export interface PatientListResponse {
  data: PatientRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
