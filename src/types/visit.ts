export type VisitStatus = "in_progress" | "completed" | "cancelled";

export interface Visit {
  id: string;
  patient_name: string;
  patient_code: string;
  patient_date_of_birth: string;
  patient_gender: "male" | "female" | "other";
  patient_background_diagnosis: string | null;
  doctor_name: string;
  clinical_note: string | null;
  status: VisitStatus;
  version: number;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
  can_edit: boolean;
}

export interface VisitSummary {
  id: string;
  doctor_name: string;
  clinical_note: string | null;
  status: VisitStatus;
  version: number;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
  can_edit: boolean;
  can_delete: boolean;
}

export interface CreateVisitResponse {
  data: Visit;
}

export interface UpdateVisitRequest {
  clinical_note: string;
  version: number;
}

export interface PaginatedVisitsResponse {
  data: VisitSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiError {
  error: {
    code:
      | "VALIDATION_ERROR"
      | "UNAUTHORIZED"
      | "FORBIDDEN"
      | "NOT_FOUND"
      | "INVALID_VISIT_STATE"
      | "VISIT_VERSION_CONFLICT"
      | "INTERNAL_ERROR";
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}
