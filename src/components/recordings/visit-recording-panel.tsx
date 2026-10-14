"use client";

import { useEffect, useState } from "react";
import { useRecordingRealtime } from "@/lib/recordings/use-recording-realtime";
import { AlertCircle, LoaderCircle, Stethoscope } from "lucide-react";
import { VisitRecordingAnalysis } from "./visit-recording-analysis";
import type { Recording } from "@/types/recording";
import type { ApiError } from "@/types/visit";

export function VisitRecordingPanel({
  patientId,
  visitId,
}: {
  patientId: string;
  visitId: string;
}) {
  return <VisitRecordingContent key={`${patientId}:${visitId}`} patientId={patientId} visitId={visitId} />;
}

function VisitRecordingContent({ patientId, visitId }: { patientId: string; visitId: string }) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const realtime = useRecordingRealtime("visit_id", visitId);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
    try {
      const response = await fetch(
        `/api/patients/${patientId}/visits/${visitId}/recording`,
        { cache: "no-store", signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      if (response.status === 404) {
        setRecording(null);
        setError("");
        return;
      }
      const payload = (await response.json()) as { data: Recording } | ApiError;
      if (controller.signal.aborted) return;
      if (!response.ok || !("data" in payload)) {
        setError(
          (payload as ApiError).error?.message || "Không thể tải bản ghi âm.",
        );
        return;
      }
      setRecording(payload.data);
      setError("");
    } catch {
      if (!controller.signal.aborted) setError("Không thể tải bản ghi âm.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
    }
    void load();
    return () => controller.abort();
  }, [patientId, visitId, realtime.revision, refresh]);

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
        {(realtime.error || error) && <div className="mb-4 text-sm text-red-600"><p role="alert">{realtime.error || error}</p><button type="button" className="btn-secondary mt-2" onClick={() => setRefresh((value) => value + 1)}>Tải lại kết quả</button></div>}
        {loading && (
          <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#6F89A8]">
            <LoaderCircle size={18} className="animate-spin" />
            Đang tải bản ghi…
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
          <VisitRecordingAnalysis key={recording.id} recording={recording} reviewHref={`/recordings/${recording.id}?from=visit&patientId=${patientId}&visitId=${visitId}`} />
        )}
      </div>
    </section>
  );
}
