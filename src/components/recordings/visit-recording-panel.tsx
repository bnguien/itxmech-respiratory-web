"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, LoaderCircle, Stethoscope } from "lucide-react";
import { RecordingWaveform } from "./recording-waveform";
import type { Recording } from "@/types/recording";
import type { ApiError } from "@/types/visit";

function duration(value: number | null) {
  if (value === null) return "—";
  return `${(value / 1000).toFixed(1)} giây`;
}

export function VisitRecordingPanel({
  patientId,
  visitId,
}: {
  patientId: string;
  visitId: string;
}) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/visits/${visitId}/recording`,
        { cache: "no-store" },
      );
      if (response.status === 404) {
        setRecording(null);
        setError("");
        return;
      }
      const payload = (await response.json()) as { data: Recording } | ApiError;
      if (!response.ok || !("data" in payload)) {
        setError(
          (payload as ApiError).error?.message || "Không thể tải bản ghi âm.",
        );
        return;
      }
      setRecording(payload.data);
      setError("");
    } catch {
      setError("Không thể tải bản ghi âm.");
    } finally {
      setLoading(false);
    }
  }, [patientId, visitId]);

  useEffect(() => {
    // Fetch the external recording state when this Visit changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (recording?.upload_status !== "waiting_upload") return;
    const timer = window.setInterval(() => void load(), 2500);
    return () => window.clearInterval(timer);
  }, [load, recording?.upload_status]);

  return (
    <section className="rounded-[22px] border border-[#DFEAF5] bg-white p-6 shadow-[0_2px_5px_rgba(23,58,94,0.08)] sm:p-8">
      <div className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#E7F2FC] text-[#2F78C8]">
          <Stethoscope size={25} />
        </span>
        <div>
          <h2 className="text-[18px] font-extrabold text-[#173A5E]">Âm phổi</h2>
          <p className="text-[14px] text-[#6F89A8]">
            Bản ghi WAV được đồng bộ từ ống nghe điện tử
          </p>
        </div>
      </div>
      <div className="mt-7 rounded-[18px] border border-[#CFE4F8] bg-[#FCFEFF] p-6">
        {loading && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#6F89A8]">
            <LoaderCircle size={18} className="animate-spin" />
            Đang tải bản ghi…
          </div>
        )}
        {!loading && error && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-red-600">
            <AlertCircle size={18} />
            {error}
          </div>
        )}
        {!loading && !error && !recording && (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <Stethoscope size={34} className="text-[#82B4E7]" />
            <b className="mt-4 text-[#173A5E]">Chưa có bản ghi âm</b>
          </div>
        )}
        {!loading &&
          !error &&
          recording?.upload_status === "waiting_upload" && (
            <div className="flex min-h-40 flex-col items-center justify-center text-center">
              <LoaderCircle size={30} className="animate-spin text-[#2F78C8]" />
              <b className="mt-4 text-[#173A5E]">
                Đang chờ bản ghi từ thiết bị
              </b>
              <p className="mt-2 text-sm text-[#6F89A8]">
                Trang sẽ tự cập nhật khi firmware upload hoàn tất.
              </p>
            </div>
          )}
        {!loading && !error && recording?.upload_status === "failed" && (
          <div className="flex min-h-40 flex-col items-center justify-center text-center">
            <AlertCircle size={32} className="text-red-500" />
            <b className="mt-4 text-red-600">Không thể nhận bản ghi âm</b>
          </div>
        )}
        {!loading && !error && recording?.upload_status === "uploaded" && (
          <div className="space-y-5">
            <RecordingWaveform recordingId={recording.id} />
            <p className="text-sm text-[#5A7799]">
              Thời lượng:{" "}
              <b className="text-[#173A5E]">
                {duration(recording.duration_ms)}
              </b>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
