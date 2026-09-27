"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Plus, Search } from "lucide-react";
import { patients } from "@/constants/mock-data";
import { SoundLabel } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/ui/page-header";
import { StartVisitModal } from "@/components/visits/start-visit-modal";

export function PatientsList() {
  const searchParams = useSearchParams();
  const requestedFilter = searchParams.get("filter");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState(
    requestedFilter === "spo2" || requestedFilter === "sound"
      ? requestedFilter
      : "all",
  );

  useEffect(() => {
    if (requestedFilter === "spo2" || requestedFilter === "sound") {
      setFilter(requestedFilter);
    } else if (requestedFilter === "all") {
      setFilter("all");
    }
  }, [requestedFilter]);

  const [open, setOpen] = useState(false);
  const list = useMemo(
    () =>
      patients.filter((p) => {
        const q = `${p.name} ${p.code} ${p.diagnosis}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return (
          q &&
          (filter === "all" ||
            (filter === "spo2" && p.spo2 < 90) ||
            (filter === "sound" && p.sound !== "Normal"))
        );
      }),
    [query, filter],
  );
  return (
    <>
      <div className="page max-w-5xl space-y-6">
        <PageHeader
          title="Bệnh nhân"
          description="Danh sách bệnh nhân đang được theo dõi"
          action={
            <button
              onClick={() => setOpen(true)}
              className="btn-primary self-start"
            >
              <Plus size={15} />
              Thêm bệnh nhân
            </button>
          }
        />
        <div className="flex flex-col justify-between gap-3 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9EC9F3]"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field !pl-10"
              style={{ paddingLeft: "2.5rem" }}
              placeholder="Tìm theo tên, mã hoặc chẩn đoán..."
            />
          </div>
          <div className="flex overflow-x-auto rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
            {[
              ["all", `Tất cả (${patients.length})`],
              ["spo2", "SpO₂ thấp"],
              ["sound", "Âm phổi bất thường"],
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
        </div>
        <div className="card divide-y divide-[#E7F1FB] overflow-hidden">
          {list.map((p) => {
            const patientTabQuery =
              filter === "spo2"
                ? "?tab=spo2"
                : filter === "sound"
                  ? "?tab=sound"
                  : "";
            return (
              <Link
                key={p.id}
                href={`/patients/${p.id}${patientTabQuery}`}
                className="group flex items-center justify-between gap-3 p-4 hover:bg-[#F4F8FD]/60"
              >
              <div className="flex min-w-0 items-center gap-3">
                <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9EC9F3]/40 bg-[#E7F1FB] text-xs font-bold">
                  {p.name
                    .split(" ")
                    .slice(-2)
                    .map((x) => x[0])
                    .join("")}
                  {p.needsAttention && (
                    <i className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                  )}
                </span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm group-hover:text-[#2F78C8]">
                    {p.name}
                  </strong>
                  <small className="text-[#5A7799]">
                    {p.code} · {p.age} tuổi · {p.gender}
                  </small>
                </span>
              </div>
              <div className="hidden w-44 md:block">
                <small className="block text-[#9EC9F3]">Chẩn đoán nền</small>
                <strong className="text-xs">{p.diagnosis}</strong>
                <em className="block text-[10px] text-[#5A7799]">
                  Do bác sĩ ghi nhận
                </em>
              </div>
              <div className="flex items-center gap-4 sm:gap-8">
                <span className="text-right">
                  <small className="block text-[#9EC9F3]">SpO₂</small>
                  <b className={p.spo2 < 90 ? "text-red-500" : ""}>{p.spo2}%</b>
                </span>
                <span className="hidden min-w-32 text-right sm:block">
                  <small className="block text-[#9EC9F3]">Âm phổi AI</small>
                  <span className="text-xs">
                    <SoundLabel value={p.sound} />
                  </span>
                </span>
                <ChevronRight size={16} className="text-[#9EC9F3]" />
              </div>
            </Link>
          );
        })}
          {list.length === 0 && (
            <p className="p-12 text-center text-sm text-[#5A7799]">
              Không tìm thấy bệnh nhân phù hợp.
            </p>
          )}
        </div>
      </div>
      <StartVisitModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
