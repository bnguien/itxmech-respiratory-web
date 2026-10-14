import type { LungSound } from "@/types/clinical";
import type { CycleLabel, CycleReviewStatus } from "@/types/analysis";
import { cycleLabels, cycleLabelStyles, cycleReviewStyles, legacyCycleLabel } from "@/lib/recordings/presentation";

export function CycleLabelBadge({ value }: { value: CycleLabel | null }) {
  const style = value ? cycleLabelStyles[value] : null;
  return <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${style?.badge ?? "border-[#E1ECF7] bg-[#F4F8FD] text-[#5A7799]"}`}>{style && <i aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: style.solid }} />}{style?.name ?? "Chưa phân loại"}</span>;
}

export function LungSoundLegend() {
  return <div aria-label="Chú thích phân loại âm phổi" className="flex flex-wrap gap-2 text-xs">
    {cycleLabels.map((label) => <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[#DFE7F1] bg-[#F4F8FD] px-3 py-1.5 font-medium text-[#173A5E]">
      <i aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: cycleLabelStyles[label].solid }} />{cycleLabelStyles[label].legend}
    </span>)}
  </div>;
}

export function CycleReviewBadge({ status }: { status: CycleReviewStatus }) {
  const style = cycleReviewStyles[status];
  return <span className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-bold ${style.badge}`}>{style.name}</span>;
}

export function SoundLabel({ value }: { value: LungSound }) {
  const color = cycleLabelStyles[legacyCycleLabel[value]].text;
  return <span className={`font-semibold ${color}`}>{value}</span>;
}

export function ReviewBadge({ confirmed }: { confirmed: boolean }) {
  return (
    <span
      className={`rounded-md px-2.5 py-1 text-[10px] font-bold ${confirmed ? "bg-[#E7F1FB] text-[#2F78C8]" : "bg-[#FFF1F2] text-[#EF4444]"}`}
    >
      {confirmed ? "Đã xác nhận" : "Chờ xác nhận"}
    </span>
  );
}
