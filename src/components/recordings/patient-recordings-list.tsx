"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { RecordingWaveform } from "./recording-waveform";
import type { PaginatedRecordingsResponse } from "@/types/recording";
import type { ApiError } from "@/types/visit";

const labels = {
  waiting_upload: "Đang chờ tải lên",
  uploaded: "Đã nhận",
  failed: "Thất bại",
} as const;

export function PatientRecordingsList({ patientId }: { patientId: string }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaginatedRecordingsResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/patients/${patientId}/recordings?page=${page}&limit=20`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as
        | PaginatedRecordingsResponse
        | ApiError;
      if (!response.ok || !("data" in payload))
        setError(
          (payload as ApiError).error?.message ||
            "Không thể tải danh sách bản ghi.",
        );
      else {
        setResult(payload);
        setError("");
      }
    } catch {
      setError("Không thể tải danh sách bản ghi.");
    } finally {
      setLoading(false);
    }
  }, [page, patientId]);
  useEffect(() => {
    // Fetch the external list when pagination changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return (
    <section className="card mt-8 overflow-hidden">
      <div className="border-b border-[#E7F1FB] px-6 py-5">
        <h2 className="text-lg font-extrabold text-[#173A5E]">Âm phổi</h2>
        <p className="mt-1 text-sm text-[#5A7799]">
          Các bản ghi WAV thật từ những lần khám của bệnh nhân.
        </p>
      </div>
      {loading && (
        <p className="p-8 text-sm text-[#5A7799]">Đang tải bản ghi…</p>
      )}
      {error && <p className="p-8 text-sm text-red-600">{error}</p>}
      {!loading && !error && result?.data.length === 0 && (
        <p className="p-12 text-center text-sm text-[#5A7799]">
          Chưa có bản ghi âm.
        </p>
      )}
      {!loading && !error && result && (
        <div className="divide-y divide-[#E7F1FB]">
          {result.data.map((recording) => (
            <article key={recording.id} className="space-y-4 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <b className="text-sm text-[#173A5E]">
                    {new Date(recording.visit_started_at).toLocaleString(
                      "vi-VN",
                    )}
                  </b>
                  <p className="mt-1 text-xs text-[#5A7799]">
                    Thời lượng:{" "}
                    {recording.duration_ms === null
                      ? "Chưa có"
                      : `${(recording.duration_ms / 1000).toFixed(1)} giây`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-[#EAF4FD] px-3 py-1 text-xs font-bold text-[#2F78C8]">
                    {labels[recording.upload_status]}
                  </span>
                  <Link
                    className="text-xs font-bold text-[#2F78C8] hover:underline"
                    href={`/patients/${patientId}/visits/${recording.visit_id}?from=sound`}
                  >
                    Mở lần khám
                  </Link>
                </div>
              </div>
              {recording.upload_status === "uploaded" && (
                <RecordingWaveform recordingId={recording.id} />
              )}
            </article>
          ))}
        </div>
      )}
      {result && result.pagination.total_pages > 1 && (
        <div className="flex justify-end gap-3 border-t border-[#E7F1FB] p-4">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            <ChevronLeft size={15} />
            Trước
          </button>
          <button
            className="btn-secondary"
            disabled={page >= result.pagination.total_pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Sau
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </section>
  );
}
