"use client";

import { useMemo, useState } from "react";
import { formatClock, summarizeDiagnostics, transportLabels } from "@/lib/wearable/presentation";
import type { DeviceDiagnostic } from "@/types/wearable";

const ms = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)} ms`);
const pct = (value: number | null) => (value === null ? "—" : `${value.toFixed(1)}%`);

/**
 * Hiệu năng vòng (DIAG mỗi 5 phút, 24 giờ gần nhất): để nhóm kỹ thuật kiểm tra CPU có quá tải không khi vòng
 * chạy bằng pin, không cắm USB. Thu gọn mặc định, không chen vào phần lâm sàng.
 */
export function DeviceDiagnosticsPanel({ items }: { items: DeviceDiagnostic[] }) {
  const [open, setOpen] = useState(false);
  const summary = useMemo(() => summarizeDiagnostics(items), [items]);
  if (items.length === 0) return null;

  return (
    <div className="mt-8 rounded-2xl border border-[#DDE8F4]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="font-bold text-[#173A5E]">Hiệu năng vòng (kỹ thuật)</span>
          <span className="mt-0.5 block text-xs text-[#5A7799]">
            24 giờ · CPU trung bình {pct(summary.cpuAvg)} · đỉnh {pct(summary.cpuPeak)} · model lâu nhất {ms(summary.modelMax)}
            {summary.resets > 0 ? ` · ${summary.resets} lần khởi động lại` : ""}
          </span>
        </span>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${summary.overloaded ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {summary.overloaded ? "Có lúc quá tải" : "Không quá tải"}
        </span>
      </button>
      {open && (
        <div className="overflow-x-auto border-t border-[#E6EEF7]">
          <p className="px-5 pt-3 text-xs text-[#5A7799]">
            Mỗi dòng là một cửa sổ 5 phút. CPU đỉnh là giây bận nhất trong cửa sổ; trên 85% được tính là quá tải.
            Thời gian model gồm tính đặc trưng, lượng tử hóa và chạy TFLite.
          </p>
          <table className="mt-2 w-full min-w-[760px] text-sm">
            <thead className="bg-[#F2F7FD] text-left text-xs text-[#5A7799]">
              <tr>
                <th className="px-5 py-2 font-semibold">Thời gian</th>
                <th className="px-3 py-2 text-right font-semibold">CPU tb</th>
                <th className="px-3 py-2 text-right font-semibold">CPU đỉnh</th>
                <th className="px-3 py-2 text-right font-semibold">Model</th>
                <th className="px-3 py-2 text-right font-semibold">Xử lý phút</th>
                <th className="px-3 py-2 text-right font-semibold">Ghi flash</th>
                <th className="px-3 py-2 text-right font-semibold">WiFi bật</th>
                <th className="px-3 py-2 text-right font-semibold">RAM trống</th>
                <th className="px-5 py-2 font-semibold">Đường truyền</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 48).map((d) => (
                <tr key={`${d.boot_id}-${d.uptime_s}`} className="border-t border-[#E6EEF7] text-[#173A5E]">
                  <td className="px-5 py-2 font-mono text-[#5A7799]">{formatClock(d.ts)}</td>
                  <td className="px-3 py-2 text-right">{pct(d.cpu_avg_pct)}</td>
                  <td className={`px-3 py-2 text-right ${d.cpu_peak_pct !== null && d.cpu_peak_pct > 85 ? "font-bold text-red-600" : ""}`}>
                    {pct(d.cpu_peak_pct)}
                  </td>
                  <td className="px-3 py-2 text-right">{ms(d.model_ms)}</td>
                  <td className="px-3 py-2 text-right">{ms(d.minute_ms)}</td>
                  <td className="px-3 py-2 text-right">{ms(d.flash_ms)}</td>
                  <td className="px-3 py-2 text-right">{d.wifi_s === null ? "—" : `${d.wifi_s} s`}</td>
                  <td className="px-3 py-2 text-right">{d.heap_min_kb === null ? "—" : `${d.heap_min_kb} KB`}</td>
                  <td className="px-5 py-2 text-[#5A7799]">{transportLabels[d.transport]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
