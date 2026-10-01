import Link from "next/link";
import { Plus } from "lucide-react";
import type { Patient, Visit } from "@/types/clinical";
import { SPO2_WARNING_THRESHOLD } from "@/constants/spo2";

export function VisitHistory({
  patient,
  visits,
  readOnly = false,
}: {
  patient: Patient;
  visits: Visit[];
  readOnly?: boolean;
}) {
  return (
    <section className="card mt-8 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold">
            Lịch sử các lần khám ({visits.length})
          </h2>
          <p className="mt-1 text-sm text-[#5A7799]">
            Các phiên theo dõi hô hấp, SpO₂ và bản ghi âm phổi của bệnh nhân
          </p>
        </div>
        {!readOnly && <Link
          href={`/patients/${patient.id}/visits/new?from=history`}
          className="btn-primary self-start px-5 py-3 text-sm"
        >
          <Plus size={17} />
          Tạo lần khám mới
        </Link>}
      </div>
      <div className="relative mt-8 space-y-6 pl-12 before:absolute before:bottom-5 before:left-4 before:top-5 before:w-px before:bg-[#DCE9F6]">
        {visits.map((visit) => {
          const abnormal = visit.spo2 < SPO2_WARNING_THRESHOLD;
          return (
            <article key={visit.id} className="card relative p-5">
              <i
                className={`absolute -left-[42px] top-8 h-4 w-4 rounded-full border-2 border-white shadow ${abnormal ? "bg-red-500" : "bg-[#2F78C8]"}`}
              />
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-3">
                    <b>{visit.startedAt}</b>
                    <span className="rounded-full bg-[#EAF4FD] px-3 py-1 text-[10px] font-bold text-[#2F78C8]">
                      Hoàn tất
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-[#8BBCEC]">
                    SpO₂:{" "}
                    <b className={abnormal ? "text-red-500" : "text-[#173A5E]"}>
                      {visit.spo2}%
                    </b>
                    &nbsp;&nbsp;·&nbsp;&nbsp;Âm phổi:{" "}
                    <b className="text-[#173A5E]">
                      {visit.recordingId ? "1 bản ghi âm" : "Chưa có bản ghi"}
                    </b>
                    &nbsp;&nbsp;·&nbsp;&nbsp;Kết quả:{" "}
                    <b
                      className={
                        visit.result === "Normal"
                          ? "text-[#2F78C8]"
                          : "text-[#EF4444]"
                      }
                    >
                      {visit.result || "Chờ kết quả"}
                    </b>
                  </p>
                  <p className="mt-2 text-sm text-[#5A7799]">
                    Bác sĩ phụ trách: <b>{visit.doctor}</b>
                  </p>
                </div>
                <Link
                  href={`/patients/${patient.id}/visits/${visit.id}?from=history`}
                  className="btn-secondary shrink-0 text-[#2F78C8]"
                >
                  Xem chi tiết
                </Link>
              </div>
              {visit.note && (
                <p className="mt-4 border-t border-[#E6EEF7] pt-4 text-sm italic leading-6 text-[#5A7799]">
                  “{visit.note}”
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
