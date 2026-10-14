"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Recording } from "@/types/recording";
import type { AnalyzedCycle, CycleReviewRequest, RecordingAnalysisData } from "@/types/analysis";
import { recordingAnalysisService } from "@/services/recording-analysis.service";
import { RecordingWaveform, type RecordingWaveformHandle } from "./recording-waveform";
import { CycleAnalysisDetails } from "./cycle-analysis-details";

const statusLabels = {
  not_analyzed: "Chưa có phân tích AI",
  analyzing: "Đang phân tích âm phổi…",
  completed: "Kết quả AI đã lưu",
  failed: "Phân tích thất bại — có thể thử lại trong trang đánh giá",
};

export function VisitRecordingAnalysis({ recording, reviewHref }: {
  recording: Recording;
  reviewHref: string;
}) {
  const [analysis, setAnalysis] = useState<RecordingAnalysisData | null>(null);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const waveform = useRef<RecordingWaveformHandle>(null);
  const readController = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    readController.current = controller;
    async function read() {
      try {
        const result = await recordingAnalysisService.get(recording.id, controller.signal);
        if (controller.signal.aborted) return;
        setAnalysis(result);
        setError("");
      } catch {
        if (!controller.signal.aborted) setError("Không thể tải kết quả phân tích đã lưu.");
      }
    }
    void read();
    return () => { controller.abort(); };
  }, [recording, refresh]);

  async function review(cycle: AnalyzedCycle, request: CycleReviewRequest) {
    readController.current?.abort();
    setSaving(true);
    setNotice("");
    try {
      const result = await recordingAnalysisService.review(recording.id, cycle.id, request);
      setAnalysis(result);
      setNotice(`Đã lưu đánh giá chu kỳ ${cycle.cycle_index + 1}.`);
    } finally { setSaving(false); }
  }

  const selected = analysis?.cycles.find((cycle) => cycle.id === selectedId) ?? analysis?.cycles[0] ?? null;
  const counts = analysis?.cycles.reduce((counts, cycle) => { counts[cycle.review_status] += 1; return counts; }, { pending: 0, confirmed: 0, corrected: 0 });
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p role="status" className="text-sm font-semibold text-[#5A7799]">{analysis ? statusLabels[analysis.recording.analysis_status] : "Đang tải phân tích đã lưu…"}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary disabled:opacity-50" disabled={saving} onClick={() => setRefresh((value) => value + 1)}>Tải lại kết quả</button>
        <Link className="btn-secondary" href={reviewHref}>Mở trang đánh giá</Link>
      </div>
    </div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <RecordingWaveform ref={waveform} recordingId={recording.id} cycles={analysis?.cycles ?? []} selectedCycleId={selected?.id} onSelectCycle={setSelectedId} onCyclePlaybackChange={setPlayingId} onReadyChange={setAudioReady} />
    <p className="text-sm text-[#5A7799]">Thời lượng: <b className="text-[#173A5E]">{recording.duration_ms === null ? "—" : `${(recording.duration_ms / 1000).toFixed(1)} giây`}</b>{analysis && <> · <b className="text-[#173A5E]">{analysis.cycles.length} chu kỳ hô hấp</b></>}</p>
    {analysis?.recording.analysis_status === "completed" && analysis.cycles.length === 0 && <p className="text-sm text-[#5A7799]">Phân tích đã hoàn tất, không phát hiện chu kỳ hô hấp.</p>}
    {analysis && analysis.cycles.length > 0 && <div className="space-y-5 border-t border-[#E7F1FB] pt-6">
      {counts && <p aria-label="Tiến độ đánh giá" className="text-xs text-[#5A7799]">Chờ xác nhận: <b>{counts.pending}</b> · Đã xác nhận: <b>{counts.confirmed}</b> · Đã hiệu chỉnh: <b>{counts.corrected}</b></p>}
      <p role="status" className="text-sm font-semibold text-[#2563A6]">{notice}</p>
      {analysis.recording.analysis_status === "analyzing" && <p className="text-sm text-[#5A7799]">Đánh giá tạm khóa trong lúc phân tích.</p>}
      {analysis.recording.analysis_status === "failed" && <p className="text-sm text-[#5A7799]">Đang hiển thị kết quả đã lưu từ lần phân tích trước.</p>}
      <CycleAnalysisDetails
        cycles={analysis.cycles}
        selected={selected}
        playingId={playingId}
        audioReady={audioReady}
        disabled={saving || analysis.recording.analysis_status === "analyzing"}
        onSelect={(cycle) => { setSelectedId(cycle.id); waveform.current?.selectCycle(cycle); }}
        onPlay={(cycle) => { setSelectedId(cycle.id); waveform.current?.playCycle(cycle); }}
        onPause={() => waveform.current?.pause()}
        onReview={review}
      />
    </div>}
  </div>;
}
