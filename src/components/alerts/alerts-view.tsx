"use client";
import { useState } from "react";
import Link from "next/link";
import { Check, CheckCheck, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { alertTime, useWearableAlerts } from "@/lib/alerts/use-wearable-alerts";
import { transportLabels } from "@/lib/wearable/presentation";
import type { WearableTransport } from "@/types/wearable";

const filters = [
  ["unread", "Chưa xem"],
  ["CRITICAL", "Nguy hiểm"],
  ["ALERT", "Cảnh báo"],
  ["all", "Tất cả"],
] as const;
type Filter = (typeof filters)[number][0];

const statusLabels = { OPEN: "Đang diễn ra", ACKNOWLEDGED: "Đã xác nhận", RESOLVED: "Đã qua" } as const;

/** Cảnh báo thật từ vòng đeo (ALERT / CRITICAL), cập nhật trực tiếp qua Realtime. */
export function AlertsView() {
  const { alerts, unread, error, loaded, acknowledge, acknowledgeAll } = useWearableAlerts();
  const [filter, setFilter] = useState<Filter>("unread");
  const list = alerts.filter((a) => (filter === "all" ? true : filter === "unread" ? !a.acknowledged_at : a.level === filter));
  return (
    <div className="page w-full space-y-6">
      <PageHeader
        title="Cảnh báo lâm sàng"
        description="Cảnh báo SpO₂ và nhịp mạch do vòng đeo gửi về (mức Cảnh báo và Nguy hiểm), mới nhất ở trên"
        action={
          <button
            onClick={() => void acknowledgeAll()}
            disabled={unread.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-[#CCE2F7] bg-[#F4F8FD] px-3 py-1.5 text-xs font-bold text-[#2F78C8] transition hover:bg-[#E7F1FB] disabled:opacity-50"
          >
            <CheckCheck size={15} />
            Đánh dấu tất cả đã xem
          </button>
        }
      />
      <div className="flex overflow-x-auto rounded-xl border border-[#E7F1FB] bg-[#F4F8FD] p-1">
        {filters.map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} className={`chip ${filter === id ? "chip-active" : ""}`}>
            {label}
            {id === "unread" && unread.length > 0 ? ` (${unread.length})` : ""}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card divide-y divide-[#E7F1FB] overflow-hidden">
        {list.map((a) => (
          <div
            key={a.id}
            className={`flex flex-col items-start gap-3 px-5 py-4 md:grid md:grid-cols-[32px_minmax(180px,1.3fr)_minmax(280px,3fr)_150px_auto] md:items-center md:gap-4 ${
              a.acknowledged_at ? "bg-[#F8FAFD]/50" : "bg-white"
            }`}
          >
            <div className="flex items-center justify-center">
              <i
                className={`h-2.5 w-2.5 rounded-full ${
                  a.level === "CRITICAL" ? "bg-red-500 ring-4 ring-red-100" : "bg-orange-500 ring-4 ring-orange-100"
                }`}
              />
            </div>
            <div className="min-w-0">
              <b className="block truncate text-xs font-bold text-[#173A5E]">{a.patient_name}</b>
              <span className="font-mono text-[11px] text-[#5A7799]">{a.patient_code}</span>
            </div>
            <div className="min-w-0">
              <span className="block text-xs font-medium leading-relaxed text-[#173A5E]">{a.summary}</span>
              <span className="text-[11px] text-[#5A7799]">
                {statusLabels[a.status]}
                {a.transport ? ` · ${transportLabels[a.transport as WearableTransport] ?? a.transport}` : ""}
                {a.family_acked_at ? ` · ${a.family_acked_by ?? "Người nhà"} đã nhận trên app` : ""}
              </span>
            </div>
            <div className="text-left md:text-right">
              <span className="text-[11px] font-medium text-[#5A7799]">
                {alertTime(a.opened_at)}
                {a.last_seen_at !== a.opened_at ? ` → ${alertTime(a.last_seen_at)}` : ""}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!a.acknowledged_at && (
                <button
                  type="button"
                  onClick={() => void acknowledge(a.id)}
                  className="flex items-center gap-1 rounded-lg border border-[#CCE2F7] px-2 py-1 text-[11px] font-bold text-[#2F78C8] hover:bg-[#F4F8FD]"
                >
                  <Check size={13} /> Đã xem
                </button>
              )}
              <Link
                href={`/patients/${a.patient_id}?tab=spo2`}
                onClick={() => {
                  if (!a.acknowledged_at) void acknowledge(a.id);
                }}
                className="flex items-center text-[#9EC9F3] transition hover:text-[#2F78C8]"
                aria-label={`Xem SpO₂ của ${a.patient_name}`}
              >
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        ))}
        {list.length === 0 && (
          <p className="p-12 text-center text-xs text-[#5A7799]">
            {loaded ? "Không có cảnh báo trong mục này." : "Đang tải cảnh báo…"}
          </p>
        )}
      </div>
    </div>
  );
}
