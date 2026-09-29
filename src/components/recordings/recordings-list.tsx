"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Pause, Play } from "lucide-react";
import { recordings } from "@/constants/mock-data";
import { PageHeader } from "@/components/ui/page-header";
import { ReviewBadge, SoundLabel } from "@/components/ui/status-badge";
export function RecordingsList() {
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get("filter");
  const [filter, setFilter] = useState(requestedFilter || "all");
  const [playing, setPlaying] = useState("");

  useEffect(() => {
    if (requestedFilter) {
      setFilter(requestedFilter);
    }
  }, [requestedFilter]);

  const list = recordings.filter(
    (r) =>
      filter === "all" ||
      (filter === "pending" && r.status === "pending_review") ||
      (filter === "confirmed" && r.status === "confirmed") ||
      r.classification === filter,
  );
  return (
    <div className="page w-full space-y-6">
      <PageHeader
        title="Bản ghi âm"
        description="Các bản ghi hoàn chỉnh từ ống nghe số và phân loại AI RespiSense"
      />
      <div className="flex overflow-x-auto rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
        {[
          ["all", "Tất cả"],
          ["pending", "Chờ xác nhận"],
          ["confirmed", "Đã xác nhận"],
          ["Normal", "Normal"],
          ["Crackles", "Crackles"],
          ["Wheezes", "Wheezes"],
          ["Crackles + Wheezes", "Crackles + Wheezes"],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`chip ${filter === id ? "chip-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Clinical Recordings Table with 100% aligned columns */}
      <div className="card overflow-hidden">
        {/* Table Header Row */}
        <div className="hidden md:grid grid-cols-[minmax(240px,2fr)_minmax(160px,1.2fr)_minmax(180px,1.3fr)_140px_80px] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799]">
          <div>Bệnh nhân & Thời gian</div>
          <div>Thông số ghi âm</div>
          <div className="text-center">Phân loại AI</div>
          <div className="text-center">Trạng thái</div>
          <div className="text-right">Nghe</div>
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-[#E7F1FB]">
          {list.map((r) => (
            <Link
              href={`/recordings/${r.id}?from=recordings`}
              key={r.id}
              className="group flex flex-col md:grid md:grid-cols-[minmax(240px,2fr)_minmax(160px,1.2fr)_minmax(180px,1.3fr)_140px_80px] items-start md:items-center gap-3 md:gap-4 px-5 py-3.5 transition hover:bg-[#F4F8FD]/70"
            >
              {/* Col 1: Bệnh nhân */}
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F1FB] text-xs font-bold text-[#173A5E]">
                  {r.patientName
                    .split(" ")
                    .slice(-2)
                    .map((x) => x[0])
                    .join("")}
                </span>
                <span className="min-w-0">
                  <b className="block truncate text-sm font-bold text-[#173A5E] group-hover:text-[#2F78C8] transition">
                    {r.patientName}
                  </b>
                  <small className="block truncate text-xs text-[#5A7799]">
                    {r.patientCode} · {r.recordedAt}
                  </small>
                </span>
              </div>

              {/* Col 2: Thông số ghi âm */}
              <div className="min-w-0">
                <span className="block truncate text-xs font-bold text-[#173A5E]">
                  {r.duration} giây · {r.cycles.length} chu kỳ
                </span>
                <span className="block text-[11px] text-[#5A7799]">
                  Thiết bị: {r.deviceId}
                </span>
              </div>

              {/* Col 3: Phân loại âm AI */}
              <div className="flex flex-col items-center">
                <SoundLabel value={r.classification} />
                <span className="mt-1 text-[10px] text-[#5A7799]">
                  Tin cậy: <b className="text-[#173A5E]">{r.confidence}%</b>
                </span>
              </div>

              {/* Col 4: Trạng thái */}
              <div className="flex justify-center">
                <ReviewBadge confirmed={r.status === "confirmed"} />
              </div>

              {/* Col 5: Play button + arrow */}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    setPlaying(playing === r.id ? "" : r.id);
                  }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                    playing === r.id
                      ? "bg-[#2F78C8] text-white shadow-xs"
                      : "border border-[#E7F1FB] bg-[#F4F8FD] text-[#5A7799] hover:bg-[#E7F1FB] hover:text-[#2F78C8]"
                  }`}
                  title={playing === r.id ? "Tạm dừng" : "Nghe âm phổi"}
                >
                  {playing === r.id ? (
                    <Pause size={13} fill="currentColor" />
                  ) : (
                    <Play size={13} fill="currentColor" />
                  )}
                </button>
                <ChevronRight size={16} className="text-[#9EC9F3] group-hover:text-[#2F78C8] group-hover:translate-x-0.5 transition" />
              </div>
            </Link>
          ))}
        </div>

        {list.length === 0 && (
          <p className="p-12 text-center text-sm text-[#5A7799]">
            Không có bản ghi âm phù hợp.
          </p>
        )}
      </div>
    </div>
  );
}
