"use client";
import { useState } from "react";
import Link from "next/link";
import { Activity, Battery, Stethoscope, Wifi, WifiOff } from "lucide-react";
import { devices } from "@/constants/mock-data";
import { PageHeader } from "@/components/ui/page-header";
export function DevicesView() {
  const [filter, setFilter] = useState("all");
  const list = devices.filter((d) => filter === "all" || d.type === filter);
  return (
    <div className="page w-full space-y-6">
      <PageHeader
        title="Thiết bị AIoT"
        description="Quản lý ống nghe số và cảm biến SpO₂ liên tục gán cho bệnh nhân"
      />
      <div className="flex w-fit rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
        {[
          ["all", `Tất cả (${devices.length})`],
          ["stetho", "Ống nghe số"],
          ["spo2", "Thiết bị SpO₂"],
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

      {/* Clinical Devices Table with 100% aligned columns */}
      <div className="card overflow-hidden">
        {/* Table Header Row */}
        <div className="hidden md:grid grid-cols-[minmax(220px,2fr)_minmax(200px,1.5fr)_130px_minmax(180px,1.2fr)] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799]">
          <div>Mã thiết bị & Loại</div>
          <div>Bệnh nhân gán</div>
          <div className="text-center">Kết nối</div>
          <div className="text-right">Pin & Trạng thái</div>
        </div>

        {/* Table Body Rows */}
        <div className="divide-y divide-[#E7F1FB]">
          {list.map((d) => (
            <div
              key={d.id}
              className="flex flex-col md:grid md:grid-cols-[minmax(220px,2fr)_minmax(200px,1.5fr)_130px_minmax(180px,1.2fr)] items-start md:items-center gap-3 md:gap-4 px-5 py-3.5 transition hover:bg-[#F4F8FD]/70"
            >
              {/* Col 1: Mã thiết bị & Loại */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#9EC9F3]/40 bg-[#E7F1FB] text-[#2F78C8]">
                  {d.type === "stetho" ? (
                    <Stethoscope size={19} />
                  ) : (
                    <Activity size={19} />
                  )}
                </span>
                <div className="min-w-0">
                  <b className="block font-mono text-xs text-[#173A5E]">{d.id}</b>
                  <span className="block text-[11px] text-[#5A7799]">
                    {d.type === "stetho" ? "Ống nghe số AI" : "Cảm biến SpO₂ liên tục"}
                  </span>
                </div>
              </div>

              {/* Col 2: Bệnh nhân gán */}
              <div className="min-w-0">
                <span className="block text-[11px] text-[#5A7799]">Đang gán theo dõi:</span>
                <Link
                  href={`/patients/${d.patientId}?tab=${d.type === "spo2" ? "spo2" : "sound"}`}
                  className="font-bold text-xs text-[#173A5E] hover:text-[#2F78C8] transition truncate block"
                >
                  {d.patientName}
                </Link>
              </div>

              {/* Col 3: Kết nối */}
              <div className="flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                    d.online
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-200/80"
                      : "bg-red-50 text-red-600 border border-red-200/80"
                  }`}
                >
                  {d.online ? <Wifi size={13} /> : <WifiOff size={13} />}
                  {d.online ? "Online" : "Offline"}
                </span>
              </div>

              {/* Col 4: Pin & Trạng thái */}
              <div className="flex flex-col items-end text-right">
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#173A5E]">
                  <Battery size={15} className={d.battery < 20 ? "text-red-500" : "text-[#2F78C8]"} />
                  {d.battery}%
                </span>
                <span className="text-[11px] text-[#5A7799]">
                  {d.lastActive} · {d.firmware}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
