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
      <div className="page w-full space-y-6">
        <PageHeader
          title="Bệnh nhân"
          description="Danh sách bệnh nhân đang được theo dõi"
          action={
            <button
              onClick={() => setOpen(true)}
              className="btn-primary self-start shadow-xs hover:shadow-md"
            >
              <Plus size={15} />
              Thêm bệnh nhân
            </button>
          }
        />
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
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

        {/* Clinical Patient Table with 100% aligned columns */}
        <div className="card overflow-hidden">
          {/* Table Header Row */}
          <div className="hidden md:grid grid-cols-[minmax(240px,2fr)_minmax(200px,1.5fr)_110px_170px_40px] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799]">
            <div>Bệnh nhân</div>
            <div>Chẩn đoán nền</div>
            <div className="text-center">SpO₂</div>
            <div className="text-center">Âm phổi AI</div>
            <div></div>
          </div>

          {/* Table Body Rows */}
          <div className="divide-y divide-[#E7F1FB]">
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
                  className="group flex flex-col md:grid md:grid-cols-[minmax(240px,2fr)_minmax(200px,1.5fr)_110px_170px_40px] items-start md:items-center gap-3 md:gap-4 px-5 py-3.5 transition hover:bg-[#F4F8FD]/70"
                >
                  {/* Column 1: Bệnh nhân (Avatar + Name + Code) */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9EC9F3]/40 bg-[#E7F1FB] text-xs font-bold text-[#173A5E]">
                      {p.name
                        .split(" ")
                        .slice(-2)
                        .map((x) => x[0])
                        .join("")}
                      {p.needsAttention && (
                        <i className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-sm font-bold text-[#173A5E] group-hover:text-[#2F78C8] transition">
                        {p.name}
                      </strong>
                      <small className="block truncate text-xs text-[#5A7799]">
                        {p.code} · {p.age} tuổi · {p.gender}
                      </small>
                    </div>
                  </div>

                  {/* Column 2: Chẩn đoán nền */}
                  <div className="min-w-0">
                    <span className="block truncate text-xs font-bold text-[#173A5E]">
                      {p.diagnosis}
                    </span>
                    <span className="block text-[11px] text-[#5A7799]">
                      Do bác sĩ ghi nhận
                    </span>
                  </div>

                  {/* Column 3: SpO2 */}
                  <div className="text-center">
                    <span
                      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-xs font-extrabold ${
                        p.spo2 < 90
                          ? "bg-red-50 text-red-600 border border-red-200/80 font-black"
                          : "text-[#173A5E] font-bold"
                      }`}
                    >
                      {p.spo2}%
                    </span>
                  </div>

                  {/* Column 4: Âm phổi AI */}
                  <div className="flex justify-center">
                    <SoundLabel value={p.sound} />
                  </div>

                  {/* Column 5: Action arrow */}
                  <div className="flex justify-end text-[#9EC9F3] group-hover:text-[#2F78C8] group-hover:translate-x-0.5 transition">
                    <ChevronRight size={17} />
                  </div>
                </Link>
              );
            })}
          </div>

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
