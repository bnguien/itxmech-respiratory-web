export type PatientGender = "male" | "female" | "other";

export interface PatientListItem {
  id: string;
  patient_code: string;
  full_name: string;
  date_of_birth: string;
  gender: PatientGender;
  phone: string | null;
  initial_symptoms: string | null;
  background_diagnosis: string | null;
}

export interface PatientDetailRecord extends PatientListItem {
  archived_at: string | null;
}

export interface PatientInput {
  full_name: string;
  date_of_birth: string;
  gender: PatientGender;
  phone?: string | null;
  initial_symptoms?: string | null;
  background_diagnosis?: string | null;
}

export interface PatientListResponse {
  data: PatientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
