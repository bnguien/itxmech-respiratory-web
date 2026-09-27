"use client";

import { useMemo, useState } from "react";
import { Spo2Chart } from "@/components/dashboard/spo2-chart";
import { getSpo2StatusLabel, spo2DataByRange } from "@/constants/spo2";

type Range = "24h" | "7d" | "30d";
const ranges: Array<{ id: Range; label: string }> = [
  { id: "24h", label: "24 giờ" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
];

export function Spo2Monitor() {
  const [range, setRange] = useState<Range>("24h");
  const data = spo2DataByRange[range];
  const summary = useMemo(() => {
    const values = data.map((point) => point.value);
    return {
      current: values.at(-1) ?? 0,
      average: Math.round(
        values.reduce((total, value) => total + value, 0) / values.length,
      ),
      highest: Math.max(...values),
      lowest: Math.min(...values),
    };
  }, [data]);

  return (
    <section className="card mt-8 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold">Theo dõi SpO₂</h2>
          <p className="mt-1 text-sm text-[#5A7799]">
            Cảm biến liên tục phát hiện giảm oxy máu sớm
          </p>
        </div>
        <div className="flex self-start rounded-xl border border-[#DDE8F4] bg-[#F1F6FB] p-1">
          {ranges.map((item) => (
            <button
              key={item.id}
              onClick={() => setRange(item.id)}
              className={`rounded-lg px-5 py-2 text-sm ${range === item.id ? "bg-white font-bold text-[#173A5E] shadow-sm" : "text-[#5A7799]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-10">
        <Spo2Chart data={data} />
      </div>
      <div className="mt-8 grid grid-cols-2 rounded-2xl border border-[#DDE8F4] bg-[#F2F7FD] py-6 text-center sm:grid-cols-4">
        {[
          ["Hiện tại", summary.current, "text-red-500"],
          ["Trung bình", summary.average, "text-[#173A5E]"],
          ["Cao nhất", summary.highest, "text-[#2F78C8]"],
          ["Thấp nhất", summary.lowest, "text-red-500"],
        ].map(([label, value, color]) => (
          <div key={label as string}>
            <small className="text-[#5A7799]">{label}</small>
            <p className={`mt-1 text-2xl font-extrabold ${color}`}>{value}%</p>
          </div>
        ))}
      </div>
      <h3 className="mt-9 font-bold">Nhật ký đo SpO₂ chi tiết</h3>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#DDE8F4]">
        {data.map((point) => {
          const abnormal = point.status === "warning";
          return (
            <div
              key={point.time}
              className="grid grid-cols-3 border-b border-[#E6EEF7] px-5 py-4 text-sm last:border-0"
            >
              <span className="font-mono text-[#5A7799]">{point.time}</span>
              <b className={abnormal ? "text-red-500" : "text-[#173A5E]"}>
                {point.value}%
              </b>
              <span
                className={`text-right font-semibold ${abnormal ? "text-red-500" : "text-[#2F78C8]"}`}
              >
                {getSpo2StatusLabel(point.value)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
