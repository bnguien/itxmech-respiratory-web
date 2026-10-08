export type RecordingUploadStatus = "waiting_upload" | "uploaded" | "failed";

export interface RecordingMetadata {
  file_size_bytes: number | null;
  duration_ms: number | null;
  sample_rate_hz: number | null;
  bit_depth: number | null;
  channel_count: number | null;
}

export interface Recording extends RecordingMetadata {
  id: string;
  visit_id: string;
  upload_status: RecordingUploadStatus;
  uploaded_at: string | null;
}

export interface RecordingSummary extends Recording {
  patient_id: string;
  patient_name: string;
  patient_code: string;
  visit_started_at: string;
}

export interface DeviceUploadUrlResponse {
  data: {
    recording_id: string;
    visit_id: string;
    upload_url: string;
    expires_in: number;
  };
}

export interface CompleteRecordingRequest {
  file_size_bytes?: number;
  duration_ms?: number;
  sample_rate_hz?: number;
  bit_depth?: number;
  channel_count?: number;
}

export interface PlaybackUrlResponse {
  data: { url: string; expires_in: number };
}

export interface PaginatedRecordingsResponse {
  data: RecordingSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}
