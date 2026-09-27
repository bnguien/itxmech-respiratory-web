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
    <div className="page max-w-4xl space-y-6">
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
      <div className="card divide-y divide-[#E7F1FB] overflow-hidden">
        {list.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-4 p-4 hover:bg-[#F4F8FD]/60"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#9EC9F3]/40 bg-[#E7F1FB] text-[#2F78C8]">
                {d.type === "stetho" ? (
                  <Stethoscope size={19} />
                ) : (
                  <Activity size={19} />
                )}
              </span>
              <span>
                <b className="block font-mono text-xs">{d.id}</b>
                <small className="text-[#5A7799]">
                  Gán:{" "}
                  <Link
                    href={`/patients/${d.patientId}?tab=${d.type === "spo2" ? "spo2" : "sound"}`}
                    className="font-bold text-[#173A5E] hover:text-[#2F78C8]"
                  >
                    {d.patientName}
                  </Link>
                </small>
              </span>
            </div>
            <span
              className={`hidden items-center gap-1 text-xs font-bold sm:flex ${d.online ? "text-[#2F78C8]" : "text-red-500"}`}
            >
              {d.online ? <Wifi size={14} /> : <WifiOff size={14} />}{" "}
              {d.online ? "Online" : "Offline"}
            </span>
            <span className="flex items-center gap-2 text-xs text-[#5A7799]">
              <Battery size={15} className="text-[#9EC9F3]" />
              {d.battery}%{" "}
              <small className="hidden text-[#9EC9F3] md:inline">
                · {d.lastActive} · {d.firmware}
              </small>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
