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
    <div className="page max-w-5xl space-y-6">
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
      <div className="card divide-y divide-[#E7F1FB] overflow-hidden">
        {list.map((r) => (
          <Link
            href={`/recordings/${r.id}?from=recordings`}
            key={r.id}
            className="group flex items-center justify-between gap-4 p-4 hover:bg-[#F4F8FD]/60"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#E7F1FB] text-xs font-bold">
                {r.patientName
                  .split(" ")
                  .slice(-2)
                  .map((x) => x[0])
                  .join("")}
              </span>
              <span className="min-w-0">
                <b className="block truncate text-sm group-hover:text-[#2F78C8]">
                  {r.patientName}
                </b>
                <small className="text-[#5A7799]">
                  {r.patientCode} · {r.recordedAt}
                </small>
              </span>
            </div>
            <span className="hidden text-xs sm:block">
              <b className="block">
                {r.duration} giây · {r.cycles.length} chu kỳ
              </b>
              <small className="text-[#9EC9F3]">{r.deviceId}</small>
            </span>
            <div className="flex items-center gap-4">
              <span className="hidden min-w-32 text-right md:block">
                <span className="text-xs">
                  <SoundLabel value={r.classification} />
                </span>
                <small className="block text-[#9EC9F3]">
                  Tin cậy: {r.confidence}%
                </small>
              </span>
              <span className="hidden lg:block">
                <ReviewBadge confirmed={r.status === "confirmed"} />
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setPlaying(playing === r.id ? "" : r.id);
                }}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${playing === r.id ? "bg-[#2F78C8] text-white" : "border border-[#E7F1FB] bg-[#F4F8FD] text-[#5A7799]"}`}
              >
                {playing === r.id ? (
                  <Pause size={13} fill="currentColor" />
                ) : (
                  <Play size={13} fill="currentColor" />
                )}
              </button>
              <ChevronRight size={16} className="text-[#9EC9F3]" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
