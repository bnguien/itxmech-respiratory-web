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
    <div className="page w-full space-y-6">
      <PageHeader
        title="Cảnh báo lâm sàng"
        description="Thông báo kịp thời về giảm oxy máu, âm phổi bất thường và trạng thái thiết bị"
        action={
          <button
            onClick={() =>
              setAlerts((v) => v.map((a) => ({ ...a, unread: false })))
            }
            className="flex items-center gap-1.5 rounded-xl border border-[#CCE2F7] bg-[#F4F8FD] px-3 py-1.5 text-xs font-bold text-[#2F78C8] transition hover:bg-[#E7F1FB]"
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
              className={`group flex flex-col md:grid md:grid-cols-[32px_minmax(180px,1.5fr)_minmax(280px,3fr)_140px_32px] items-start md:items-center gap-3 md:gap-4 px-5 py-4 transition hover:bg-[#F4F8FD] ${
                a.unread ? "bg-white" : "bg-[#F8FAFD]/50"
              }`}
            >
              {/* Severity indicator */}
              <div className="flex items-center justify-center">
                <i
                  className={`h-2.5 w-2.5 rounded-full ${
                    a.severity === "critical"
                      ? "bg-red-500 ring-4 ring-red-100"
                      : a.severity === "warning"
                        ? "bg-amber-500 ring-4 ring-amber-100"
                        : "bg-[#2F78C8] ring-4 ring-blue-100"
                  }`}
                />
              </div>

              {/* Patient info */}
              <div className="min-w-0">
                <b className="block truncate text-xs font-bold text-[#173A5E] group-hover:text-[#2F78C8] transition">
                  {a.patientName || "Hệ thống thiết bị AIoT"}
                </b>
                {a.patientCode && (
                  <span className="font-mono text-[11px] text-[#5A7799]">
                    {a.patientCode}
                  </span>
                )}
              </div>

              {/* Message */}
              <div className="min-w-0">
                <span className="block text-xs text-[#173A5E] font-medium leading-relaxed">
                  {a.message}
                </span>
              </div>

              {/* Timestamp */}
              <div className="text-left md:text-right">
                <span className="text-[11px] font-medium text-[#5A7799]">
                  {a.time}
                </span>
              </div>

              {/* Chevron */}
              <div className="flex justify-end text-[#9EC9F3] group-hover:text-[#2F78C8] group-hover:translate-x-0.5 transition">
                <ChevronRight size={16} />
              </div>
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
