"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCheck, ChevronRight } from "lucide-react";
import { alerts as seed } from "@/constants/mock-data";
import { PageHeader } from "@/components/ui/page-header";
export function AlertsView() {
  const [alerts, setAlerts] = useState(seed);
  const [filter, setFilter] = useState("all");
  const list = alerts.filter((a) => filter === "all" || a.type === filter);
  return (
    <div className="page max-w-4xl space-y-6">
      <PageHeader
        title="Cảnh báo lâm sàng"
        description="Thông báo kịp thời về giảm oxy máu, âm phổi bất thường và trạng thái thiết bị"
        action={
          <button
            onClick={() =>
              setAlerts((v) => v.map((a) => ({ ...a, unread: false })))
            }
            className="flex items-center gap-1 text-xs font-bold text-[#2F78C8]"
          >
            <CheckCheck size={15} />
            Đánh dấu tất cả đã đọc
          </button>
        }
      />
      <div className="flex overflow-x-auto rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
        {[
          ["all", "Tất cả"],
          ["spo2", "SpO₂ thấp"],
          ["sound", "Âm phổi bất thường"],
          ["review", "Bản ghi chờ xác nhận"],
          ["device", "Thiết bị mất kết nối"],
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
        {list.map((a) => {
          const alertHref = a.patientId
            ? a.type === "spo2"
              ? `/patients/${a.patientId}?tab=spo2`
              : a.type === "sound" || a.type === "review"
                ? `/patients/${a.patientId}?tab=sound`
                : `/patients/${a.patientId}`
            : "/devices";
          return (
            <Link
              key={a.id}
              href={alertHref}
              onClick={() =>
                setAlerts((v) =>
                  v.map((x) => (x.id === a.id ? { ...x, unread: false } : x)),
                )
              }
              className={`group flex items-center justify-between gap-4 p-4 hover:bg-[#F4F8FD] ${a.unread ? "bg-white" : "bg-[#F4F8FD]/40"}`}
            >
            <div className="flex min-w-0 items-center gap-3">
              <i
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${a.severity === "critical" ? "bg-red-500" : a.severity === "warning" ? "bg-amber-500" : "bg-[#2F78C8]"}`}
              />
              <span className="min-w-0">
                <b className="block truncate text-xs">
                  {a.patientName || "Hệ thống thiết bị"}{" "}
                  {a.patientCode && (
                    <small className="ml-2 font-mono font-normal text-[#9EC9F3]">
                      {a.patientCode}
                    </small>
                  )}
                </b>
                <span className="mt-1 block text-xs text-[#5A7799]">
                  {a.message}
                </span>
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-3 text-[10px] text-[#9EC9F3]">
              {a.time}
              <ChevronRight size={15} />
            </span>
          </Link>
        );
      })}
        {list.length === 0 && (
          <p className="p-12 text-center text-xs text-[#5A7799]">
            Không có cảnh báo trong mục này.
          </p>
        )}
      </div>
    </div>
  );
}
