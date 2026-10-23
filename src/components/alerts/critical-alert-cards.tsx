"use client";

import Link from "next/link";
import { AlertOctagon, Check, ChevronRight } from "lucide-react";
import { alertTime, useWearableAlerts } from "@/lib/alerts/use-wearable-alerts";
import { transportLabels } from "@/lib/wearable/presentation";
import type { WearableTransport } from "@/types/wearable";

/**
 * Thẻ Nguy hiểm (CRITICAL) chưa xem, hiện ở đầu mọi trang để bác sĩ chú ý ngay.
 * ALERT không có thẻ, chỉ cập nhật chuông thông báo.
 */
export function CriticalAlertCards() {
  const { criticalOpen, acknowledge } = useWearableAlerts();
  if (criticalOpen.length === 0) return null;
  return (
    <section aria-label="Cảnh báo nguy hiểm" className="space-y-2 border-b border-red-100 bg-red-50/60 px-4 py-3 sm:px-6">
      {criticalOpen.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
            <AlertOctagon size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-red-700">
              NGUY HIỂM · {alert.patient_name}
              <span className="ml-2 font-mono text-xs font-semibold text-red-500">{alert.patient_code}</span>
            </p>
            <p className="mt-0.5 text-sm text-[#173A5E]">{alert.summary}</p>
            <p className="mt-0.5 text-xs text-[#5A7799]">
              Bắt đầu {alertTime(alert.opened_at)} · mới nhất {alertTime(alert.last_seen_at)}
              {alert.transport ? ` · ${transportLabels[alert.transport as WearableTransport] ?? alert.transport}` : ""}
              {alert.family_acked_at ? ` · ${alert.family_acked_by ?? "Người nhà"} đã nhận` : " · người nhà chưa xác nhận"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Link
              href={`/patients/${alert.patient_id}?tab=spo2`}
              className="flex items-center gap-1 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-700"
            >
              Xem bệnh nhân <ChevronRight size={14} />
            </Link>
            <button
              type="button"
              onClick={() => void acknowledge(alert.id)}
              className="flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
            >
              <Check size={14} /> Đã xem
            </button>
          </div>
        </div>
      ))}
      {criticalOpen.length > 3 && (
        <Link href="/alerts" className="block text-xs font-bold text-red-700 hover:underline">
          Còn {criticalOpen.length - 3} cảnh báo nguy hiểm khác
        </Link>
      )}
    </section>
  );
}
