"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  AudioLines,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import type {
  AnalyzedCycle,
  CycleReviewRequest,
  RecordingAnalysisData,
} from "@/types/analysis";
import { recordingAnalysisService } from "@/services/recording-analysis.service";
import {
  RecordingWaveform,
  type RecordingWaveformHandle,
} from "./recording-waveform";
import { CycleAnalysisDetails } from "./cycle-analysis-details";
import { useRecordingRealtime } from "@/lib/recordings/use-recording-realtime";
import { RecordingPatientHeader } from "./recording-patient-header";

export function RecordingAnalysis({ recordingId }: { recordingId: string }) {
  const realtime = useRecordingRealtime("id", recordingId);
  const searchParams = useSearchParams();
  const patientId = searchParams.get("patientId");
  const visitId = searchParams.get("visitId");
  const from = searchParams.get("from");
  const backHref =
    patientId && from === "visit" && visitId
      ? `/patients/${encodeURIComponent(patientId)}/visits/${encodeURIComponent(visitId)}`
      : patientId
        ? `/patients/${encodeURIComponent(patientId)}?tab=sound`
        : "/recordings";
  const [data, setData] = useState<RecordingAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [savingReview, setSavingReview] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const waveform = useRef<RecordingWaveformHandle>(null);
  const readController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    readController.current = controller;
    async function load() {
      if (controller.signal.aborted) return;
      try {
        const result = await recordingAnalysisService.get(
          recordingId,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setData(result);
        setError("");
      } catch {
        if (!controller.signal.aborted)
          setError("Không thể tải phân tích. Vui lòng thử lại.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [recordingId, refresh, realtime.revision]);

  const reload = () => {
    setError("");
    setLoading(!data);
    setRefresh((value) => value + 1);
  };
  const busy = analyzing || data?.recording.analysis_status === "analyzing";
  const selected =
    data?.cycles.find((cycle) => cycle.id === selectedId) ??
    data?.cycles[0] ??
    null;
  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setNotice("");
  }, []);

  async function analyze() {
    readController.current?.abort();
    setAnalyzing(true);
    setError("");
    setNotice("");
    try {
      const result = await recordingAnalysisService.analyze(recordingId);
      setData(result);
      // Read persisted state after a concurrent analysis claim.
      if (result.recording.analysis_status === "analyzing")
        setRefresh((value) => value + 1);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Không thể phân tích bản ghi.",
      );
      // Read the persisted failure/in-progress state without discarding previously reviewed cycles.
      try {
        const result = await recordingAnalysisService.get(recordingId);
        setData(result);
        if (result.recording.analysis_status === "analyzing")
          setRefresh((value) => value + 1);
      } catch {
        /* Keep the visible last result. */
      }
    } finally {
      setAnalyzing(false);
    }
  }

  async function review(cycle: AnalyzedCycle, request: CycleReviewRequest) {
    readController.current?.abort();
    setSavingReview(true);
    setNotice("");
    try {
      const result = await recordingAnalysisService.review(
        recordingId,
        cycle.id,
        request,
      );
      setData(result);
      setNotice(`Đã lưu đánh giá chu kỳ ${cycle.cycle_index + 1}.`);
    } finally {
      setSavingReview(false);
    }
  }

  function select(cycle: AnalyzedCycle) {
    handleSelect(cycle.id);
    waveform.current?.selectCycle(cycle);
  }

  const duration =
    audioDuration ??
    (data?.recording.duration_ms == null
      ? null
      : data.recording.duration_ms / 1000);
  const counts = data?.cycles.reduce(
    (counts, cycle) => {
      counts[cycle.review_status] += 1;
      return counts;
    },
    { pending: 0, confirmed: 0, corrected: 0 },
  );

  return (
    <div className="page space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#5A7799] hover:text-[#2F78C8]"
      >
        <ArrowLeft size={17} />
        {patientId
          ? from === "visit"
            ? "Chi tiết lần khám"
            : "Âm phổi bệnh nhân"
          : "Danh sách bản ghi"}
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E7F1FB] pb-5">
        <div>
          <p className="eyebrow">RespiratoryCare · Âm phổi</p>
          <h1 className="mt-2 page-title">
            Phân tích & đánh giá chu kỳ hô hấp
          </h1>
          <p className="page-subtitle">
            Nghe từng chu kỳ, đối chiếu kết quả AI và lưu đánh giá của bác sĩ.
          </p>
        </div>
        {data && (
          <button
            type="button"
            onClick={reload}
            disabled={savingReview || analyzing}
            className="btn-secondary hover:bg-[#F4F8FD] disabled:opacity-50"
          >
            <RefreshCw size={14} />
            Tải lại kết quả
          </button>
        )}
      </header>
      {realtime.error && <p role="alert" className="text-sm text-red-700">{realtime.error}</p>}

      <RecordingPatientHeader key={recordingId} recordingId={recordingId} />

      {loading && (
        <div
          role="status"
          className="card flex min-h-64 items-center justify-center gap-3 p-8 text-sm text-[#5A7799]"
        >
          <LoaderCircle className="animate-spin" size={20} />
          Đang tải phân tích bản ghi…
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={reload}
            className="btn-secondary"
            disabled={savingReview || analyzing}
          >
            Thử tải lại
          </button>
        </div>
      )}

      {data && !loading && (
        <>
          {busy ? (
            <div
              role="status"
              className="flex items-center gap-3 rounded-xl border border-[#CFE2F5] bg-[#E7F1FB] p-4 text-sm text-[#2563A6]"
            >
              <LoaderCircle size={19} className="shrink-0 animate-spin" />
              <div>
                <b>Đang phân tích âm phổi…</b>
                <p className="mt-1">
                  Kết quả sẽ tự cập nhật. Đánh giá tạm khóa trong lúc phân tích.
                </p>
              </div>
            </div>
          ) : data.recording.analysis_status === "not_analyzed" ? (
            <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex items-center gap-3">
                <AudioLines size={24} className="text-[#2F78C8]" />
                <div>
                  <h2 className="text-sm font-bold">
                    Bản ghi chưa được phân tích
                  </h2>
                  <p className="mt-1 text-xs text-[#5A7799]">
                    Chạy AI để phân đoạn và phân loại từng chu kỳ.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={data.recording.upload_status !== "uploaded"}
                onClick={() => void analyze()}
                className="btn-primary disabled:opacity-50"
              >
                Phân tích âm phổi
              </button>
            </div>
          ) : data.recording.analysis_status === "failed" ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-5"
            >
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-red-700">
                  <AlertCircle size={18} />
                  Phân tích thất bại
                </h2>
                <p className="mt-2 text-sm text-red-700">
                  {data.recording.analysis_error ??
                    "Không thể phân tích bản ghi. Vui lòng thử lại."}
                </p>
                {data.cycles.length > 0 && (
                  <p className="mt-2 text-xs text-[#5A7799]">
                    Đang hiển thị kết quả đã lưu từ lần phân tích trước.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => void analyze()}
                disabled={
                  savingReview || data.recording.upload_status !== "uploaded"
                }
                className="btn-secondary disabled:opacity-50"
              >
                Phân tích lại
              </button>
            </div>
          ) : null}

          <section
            aria-label="Tổng quan dạng sóng"
            className="card space-y-5 p-4 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-[#5A7799]">
                Nhãn hiển thị ưu tiên đánh giá bác sĩ
              </span>
            </div>
            {data.recording.upload_status === "uploaded" ? (
              <RecordingWaveform
                ref={waveform}
                recordingId={recordingId}
                cycles={data.cycles}
                selectedCycleId={selected?.id}
                onSelectCycle={handleSelect}
                onCyclePlaybackChange={setPlayingId}
                onDurationChange={setAudioDuration}
                onReadyChange={setAudioReady}
              />
            ) : (
              <p className="rounded-xl bg-[#F4F8FD] p-6 text-sm text-[#5A7799]">
                Bản ghi chưa sẵn sàng để phát.
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E7F1FB] pt-4 text-xs text-[#5A7799]">
              <p>
                Thời lượng:{" "}
                <b className="text-[#173A5E]">
                  {duration === null ? "—" : `${duration.toFixed(1)} giây`}
                </b>
                <span className="mx-3">·</span>Tổng số chu kỳ:{" "}
                <b className="text-[#173A5E]">
                  {data.cycles.length} chu kỳ hô hấp
                </b>
              </p>
              {counts && (
                <p aria-label="Tiến độ đánh giá">
                  Chờ xác nhận: <b>{counts.pending}</b>
                  <span className="mx-2">·</span>Đã xác nhận:{" "}
                  <b>{counts.confirmed}</b>
                  <span className="mx-2">·</span>Đã hiệu chỉnh:{" "}
                  <b>{counts.corrected}</b>
                </p>
              )}
            </div>
          </section>

          <p role="status" className="text-sm font-semibold text-[#2563A6]">
            {notice}
          </p>
          {data.cycles.length === 0 &&
            data.recording.analysis_status === "completed" && (
              <div className="card p-10 text-center">
                <AudioLines size={28} className="mx-auto text-[#5A7799]" />
                <h2 className="mt-3 font-bold">Không có chu kỳ hô hấp</h2>
                <p className="mt-2 text-sm text-[#5A7799]">
                  Phân tích đã hoàn tất nhưng chưa phát hiện chu kỳ để đánh giá.
                  Bạn vẫn có thể nghe toàn bộ bản ghi.
                </p>
              </div>
            )}

          {data.cycles.length > 0 && (
            <CycleAnalysisDetails
              cycles={data.cycles}
              selected={selected}
              playingId={playingId}
              audioReady={audioReady}
              disabled={busy || savingReview}
              onSelect={select}
              onPlay={(cycle) => {
                handleSelect(cycle.id);
                waveform.current?.playCycle(cycle);
              }}
              onPause={() => waveform.current?.pause()}
              onReview={review}
            />
          )}
        </>
      )}
    </div>
  );
}
