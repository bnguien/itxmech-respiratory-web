"use client";

import { useId, useState } from "react";
import { CheckCircle2, LoaderCircle, Pause, Pencil, Play, X } from "lucide-react";
import type { AnalyzedCycle, CycleLabel, CycleReviewRequest } from "@/types/analysis";
import { CycleLabelBadge, CycleReviewBadge } from "@/components/ui/status-badge";
import { cycleLabels, cycleLabelStyles, effectiveCycleLabel, secondsText } from "@/lib/recordings/presentation";

interface Props {
  cycles: AnalyzedCycle[];
  selected: AnalyzedCycle | null;
  playingId: string | null;
  audioReady: boolean;
  disabled: boolean;
  onSelect: (cycle: AnalyzedCycle) => void;
  onPlay: (cycle: AnalyzedCycle) => void;
  onPause: () => void;
  onReview: (cycle: AnalyzedCycle, request: CycleReviewRequest) => Promise<void>;
}

export function CycleAnalysisDetails({ cycles, ...props }: Props) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="min-w-0">
      <div className="mb-4">
        <h2 id={headingId} className="text-base font-extrabold">Chi tiết từng chu kỳ hô hấp</h2>
        <p className="mt-1 text-xs text-[#5A7799]">Nghe, xác nhận hoặc sửa nhãn trực tiếp tại từng chu kỳ.</p>
      </div>
      <div className="flex flex-col gap-3">
        {cycles.map((cycle) => <CycleReviewRow key={`${cycle.id}:${cycle.updated_at}`} cycle={cycle} {...props} />)}
      </div>
    </section>
  );
}

function CycleReviewRow({ cycle, selected, playingId, audioReady, disabled, onSelect, onPlay, onPause, onReview }: Omit<Props, "cycles"> & { cycle: AnalyzedCycle }) {
  const fieldId = useId();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState<CycleLabel | "">(effectiveCycleLabel(cycle) ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const number = cycle.cycle_index + 1;
  const busy = disabled || saving;
  const canConfirm = cycle.ai_status === "processed" && cycle.ai_label !== null;

  async function save(action: "confirm" | "correct") {
    if (busy || (action === "correct" && !label)) return;
    setSaving(true);
    setError("");
    onSelect(cycle);
    try {
      await onReview(cycle, action === "confirm"
        ? { action, expected_updated_at: cycle.updated_at }
        : { action, doctor_label: label as CycleLabel, expected_updated_at: cycle.updated_at });
      setEditing(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể lưu đánh giá. Vui lòng thử lại.");
    } finally { setSaving(false); }
  }

  function cancel() {
    setLabel(effectiveCycleLabel(cycle) ?? "");
    setEditing(false);
    setError("");
  }

  return (
    <article aria-label={`Chu kỳ ${number}`} className={`card w-full p-4 transition-shadow sm:p-5 ${selected?.id === cycle.id ? "ring-2 ring-[#2F78C8]" : "hover:shadow-sm"}`}>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-48 flex-1 items-center gap-3">
          <button type="button" aria-label={`${playingId === cycle.id ? "Tạm dừng" : "Nghe"} chu kỳ ${number}`} disabled={!audioReady} onClick={() => playingId === cycle.id ? onPause() : onPlay(cycle)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F1FB] text-[#2F78C8] hover:bg-[#D9EAFB] focus-visible:outline-2 focus-visible:outline-[#2F78C8] disabled:opacity-40">
            {playingId === cycle.id ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <div>
            <h3><button type="button" aria-label={`Chọn chu kỳ ${number}`} aria-pressed={selected?.id === cycle.id} onClick={() => onSelect(cycle)} className="rounded text-sm font-extrabold hover:text-[#2F78C8] focus-visible:outline-2 focus-visible:outline-[#2F78C8]">Chu kỳ {number}</button></h3>
            <p className="mt-1 font-mono text-xs text-[#5A7799]">{secondsText(cycle.start_seconds)} – {secondsText(cycle.end_seconds)}</p>
            <p className="mt-1 text-xs text-[#5A7799]">Thời lượng: {secondsText(cycle.duration_seconds)}</p>
          </div>
        </div>
        <div className="min-w-40 flex-1 space-y-1.5">
          <CycleLabelBadge value={effectiveCycleLabel(cycle)} />
          <p className="text-xs text-[#5A7799]">AI gốc: {cycle.ai_label ? cycleLabelStyles[cycle.ai_label].name : "Chưa phân loại"}</p>
          {cycle.doctor_label && <p className="text-xs text-[#5A7799]">Nhãn bác sĩ: {cycleLabelStyles[cycle.doctor_label].name}</p>}
        </div>
        <CycleReviewBadge status={cycle.review_status} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-label={`Xác nhận kết quả AI chu kỳ ${number}`} disabled={busy || !canConfirm} onClick={() => void save("confirm")} className="btn-secondary hover:bg-[#F4F8FD] disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Xác nhận AI
          </button>
          <button type="button" aria-label={`Sửa nhãn chu kỳ ${number}`} disabled={busy} aria-expanded={editing} aria-controls={`${fieldId}-form`} onClick={() => { if (editing) cancel(); else { setEditing(true); setError(""); onSelect(cycle); } }} className="btn-secondary hover:bg-[#F4F8FD] disabled:cursor-not-allowed disabled:opacity-50"><Pencil size={14} />Sửa nhãn</button>
        </div>
      </div>
      {cycle.ai_status === "unprocessable" && <p className="mt-3 text-xs text-[#5A7799]">AI chưa thể phân loại chu kỳ này. Bác sĩ có thể chọn nhãn trực tiếp.</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {editing && (
        <form id={`${fieldId}-form`} aria-label={`Sửa nhãn chu kỳ ${number}`} onSubmit={(event) => { event.preventDefault(); if (label) void save(canConfirm && label === cycle.ai_label ? "confirm" : "correct"); }} className="mt-4 flex flex-wrap items-end gap-3 border-t border-[#E7F1FB] pt-4">
          <div className="min-w-48 flex-1 sm:max-w-xs">
            <label htmlFor={fieldId} className="mb-2 block text-xs font-bold">Nhãn bác sĩ cho chu kỳ {number}</label>
            <select id={fieldId} autoFocus value={label} onChange={(event) => setLabel(event.target.value as CycleLabel)} disabled={busy} required className="field bg-white" style={{ color: label ? cycleLabelStyles[label].textColor : undefined }}>
              <option value="" disabled>Chọn nhãn</option>
              {cycleLabels.map((key) => <option key={key} value={key} style={{ color: cycleLabelStyles[key].textColor }}>{cycleLabelStyles[key].name}</option>)}
            </select>
          </div>
          <button type="submit" disabled={busy || !label} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">{saving && <LoaderCircle size={15} className="animate-spin" />}Lưu nhãn</button>
          <button type="button" onClick={cancel} disabled={busy} className="btn-secondary disabled:opacity-50"><X size={14} />Hủy</button>
        </form>
      )}
    </article>
  );
}
