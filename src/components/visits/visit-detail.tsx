import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import type { Patient, Visit } from "@/types/clinical";
import { recordings } from "@/constants/mock-data";
import { SoundLabel } from "@/components/ui/status-badge";

export function VisitDetail({
  patient,
  visit,
  returnTab = "overview",
}: {
  patient: Patient;
  visit: Visit;
  returnTab?: string;
}) {
  const recording =
    recordings.find((item) => item.id === visit.recordingId) || recordings[0];
  return (
    <div className="page w-full space-y-6">
      <Link
        href={`/patients/${patient.id}?tab=${returnTab}`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5A7799] hover:text-[#2F78C8]"
      >
        <ArrowLeft size={14} />
        {returnTab === "history" ? "Lịch sử khám bệnh nhân" : "Hồ sơ bệnh nhân"}
      </Link>
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div>
          <span className="eyebrow">Chi tiết lần khám</span>
          <h1 className="page-title mt-1">{patient.name}</h1>
          <p className="page-subtitle">
            {visit.startedAt} · {visit.doctor}
          </p>
        </div>
        <span className="flex self-start items-center gap-1 rounded-full bg-[#E7F1FB] px-3 py-1.5 text-xs font-bold text-[#2F78C8]">
          <CheckCircle2 size={14} />
          Hoàn tất
        </span>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <div className="card p-5">
          <small className="text-[#5A7799]">SpO₂</small>
          <p
            className={`mt-2 text-3xl font-extrabold ${visit.spo2 < 90 ? "text-red-500" : "text-[#2F78C8]"}`}
          >
            {visit.spo2}%
          </p>
        </div>
        <div className="card p-5">
          <small className="text-[#5A7799]">Kết quả âm phổi</small>
          <p className="mt-3">
            <SoundLabel value={visit.result || recording.classification} />
          </p>
        </div>
        <div className="card p-5">
          <small className="text-[#5A7799]">Bản ghi</small>
          <p className="mt-2 text-sm font-bold">
            {recording.duration}s · {recording.cycles.length} cycles
          </p>
          <Link
            href={`/recordings/${recording.id}?from=visit&patientId=${patient.id}&visitId=${visit.id}&returnTab=${returnTab}`}
            className="mt-2 block text-xs font-bold text-[#2F78C8] hover:underline"
          >
            Xem phân tích →
          </Link>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="text-sm font-bold">Ghi chú bác sĩ</h2>
        <p className="mt-3 text-xs leading-6 text-[#5A7799]">
          {visit.note ||
            "Kết quả đã được bác sĩ xác nhận. Tiếp tục theo dõi SpO₂ và đánh giá lại âm phổi trong lần khám tiếp theo."}
        </p>
      </section>
    </div>
  );
}
