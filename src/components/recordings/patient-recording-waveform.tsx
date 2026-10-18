"use client";

import { useEffect, useState } from "react";
import { recordingAnalysisService } from "@/services/recording-analysis.service";
import type { RecordingAnalysisData } from "@/types/analysis";
import { RecordingWaveform } from "./recording-waveform";

export function PatientRecordingWaveform({ recordingId }: { recordingId: string }) {
  const [analysis, setAnalysis] = useState<RecordingAnalysisData | null>(null);
  const [error, setError] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    recordingAnalysisService.get(recordingId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setAnalysis(result);
          setError("");
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Không thể tải nhãn AI đã lưu.");
      });
    return () => controller.abort();
  }, [recordingId]);

  return (
    <div className="space-y-2">
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <RecordingWaveform
        recordingId={recordingId}
        cycles={analysis?.cycles ?? []}
        selectedCycleId={selectedCycleId}
        onSelectCycle={setSelectedCycleId}
      />
    </div>
  );
}
