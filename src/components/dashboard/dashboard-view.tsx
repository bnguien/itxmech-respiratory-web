"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, Plus } from "lucide-react";
import { patients, recordings } from "@/constants/mock-data";
import { SoundLabel } from "@/components/ui/status-badge";
import { Spo2Chart } from "./spo2-chart";
import { StartVisitModal } from "@/components/visits/start-visit-modal";
import { spo2DataByRange } from "@/constants/spo2";

export function DashboardView() {
  const [open, setOpen] = useState(false);
  const [spo2Range, setSpo2Range] = useState<"24h" | "7d" | "30d">("24h");
  const attention = patients.filter((p) => p.needsAttention);
  const spo2LowCount = patients.filter((p) => p.spo2 < 90).length;
  const pendingRecordingsCount = recordings.filter(
    (r) => r.status === "pending_review",
  ).length;

  return (
    <>
      <div className="page w-full space-y-6">
        {/* Header row with CTA button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-[#173A5E]">
              Tổng quan giám sát lâm sàng
            </h2>
            <p className="text-xs text-[#5A7799] mt-0.5">
              Theo dõi và phân tích tín hiệu AIoT thời gian thực
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="btn-primary self-start sm:self-auto shadow-xs hover:shadow-md"
          >
            <Plus size={16} />
            Bắt đầu khám
          </button>
        </div>

        {/* 3 Metric Cards matching Reference Image 2 with Inverted Corner Cutouts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Bệnh nhân cần chú ý (Warm Pastel Peach) */}
          <Link
            href="/patients"
            className="group relative flex flex-col justify-between min-h-[165px] rounded-[28px] bg-[#FEEFD5] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <h3 className="text-base font-extrabold text-[#173A5E] leading-snug">
                Bệnh nhân cần chú ý
              </h3>
              <p className="mt-1 text-xs font-medium text-[#78716C]">
                Ưu tiên theo dõi lâm sàng
              </p>
            </div>
            <div className="mt-4 flex items-end">
              <span className="text-4xl font-black tracking-tight text-[#173A5E]">
                {attention.length}
              </span>
            </div>

            {/* Inverted corner cutout with action button */}
            <svg
              className="pointer-events-none absolute bottom-[55px] right-[-1px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M20 0 V20 H0 A20 20 0 0 0 20 0 Z" />
            </svg>
            <svg
              className="pointer-events-none absolute bottom-[-1px] right-[55px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M0 20 H20 V0 A20 20 0 0 0 0 20 Z" />
            </svg>
            <div className="absolute -bottom-[1px] -right-[1px] flex h-[56px] w-[56px] items-center justify-center rounded-tl-[20px] bg-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181B] text-white shadow-xs transition-all duration-200 group-hover:scale-110 group-hover:bg-[#2F78C8]">
                <ArrowUpRight size={17} strokeWidth={2.5} />
              </div>
            </div>
          </Link>

          {/* Card 2: SpO₂ thấp (Soft Sky Blue) */}
          <Link
            href="/patients?filter=spo2"
            className="group relative flex flex-col justify-between min-h-[165px] rounded-[28px] bg-[#DBEAFE] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <h3 className="text-base font-extrabold text-[#173A5E] leading-snug">
                SpO₂ thấp
              </h3>
              <p className="mt-1 text-xs font-medium text-[#5A7799]">
                Dưới ngưỡng cảnh báo 90%
              </p>
            </div>
            <div className="mt-4 flex items-end">
              <span className="text-4xl font-black tracking-tight text-[#173A5E]">
                {spo2LowCount}
              </span>
            </div>

            {/* Inverted corner cutout with action button */}
            <svg
              className="pointer-events-none absolute bottom-[55px] right-[-1px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M20 0 V20 H0 A20 20 0 0 0 20 0 Z" />
            </svg>
            <svg
              className="pointer-events-none absolute bottom-[-1px] right-[55px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M0 20 H20 V0 A20 20 0 0 0 0 20 Z" />
            </svg>
            <div className="absolute -bottom-[1px] -right-[1px] flex h-[56px] w-[56px] items-center justify-center rounded-tl-[20px] bg-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181B] text-white shadow-xs transition-all duration-200 group-hover:scale-110 group-hover:bg-[#2F78C8]">
                <ArrowUpRight size={17} strokeWidth={2.5} />
              </div>
            </div>
          </Link>

          {/* Card 3: Phân tích âm phổi chờ xác nhận (Soft Slate Lavender) */}
          <Link
            href="/recordings?filter=pending"
            className="group relative flex flex-col justify-between min-h-[165px] rounded-[28px] bg-[#E5E7EB] p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
          >
            <div>
              <h3 className="text-base font-extrabold text-[#173A5E] leading-snug">
                Phân tích âm phổi chờ xác nhận
              </h3>
              <p className="mt-1 text-xs font-medium text-[#64748B]">
                Bản ghi ống nghe AI RespiSense
              </p>
            </div>
            <div className="mt-4 flex items-end">
              <span className="text-4xl font-black tracking-tight text-[#173A5E]">
                {pendingRecordingsCount}
              </span>
            </div>

            {/* Inverted corner cutout with action button */}
            <svg
              className="pointer-events-none absolute bottom-[55px] right-[-1px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M20 0 V20 H0 A20 20 0 0 0 20 0 Z" />
            </svg>
            <svg
              className="pointer-events-none absolute bottom-[-1px] right-[55px] h-[20px] w-[20px] fill-white"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path d="M0 20 H20 V0 A20 20 0 0 0 0 20 Z" />
            </svg>
            <div className="absolute -bottom-[1px] -right-[1px] flex h-[56px] w-[56px] items-center justify-center rounded-tl-[20px] bg-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181B] text-white shadow-xs transition-all duration-200 group-hover:scale-110 group-hover:bg-[#2F78C8]">
                <ArrowUpRight size={17} strokeWidth={2.5} />
              </div>
            </div>
          </Link>
        </div>
        <section className="space-y-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold">Bệnh nhân cần chú ý</h2>
            <Link href="/patients" className="text-xs font-bold text-[#2F78C8]">
              Xem tất cả
            </Link>
          </div>
          <div className="space-y-2.5">
            {patients.slice(0, 5).map((p) => {
              const targetTab =
                p.spo2 < 90
                  ? "?tab=spo2"
                  : p.sound !== "Normal"
                    ? "?tab=sound"
                    : "";
              return (
                <Link
                  href={`/patients/${p.id}${targetTab}`}
                  key={p.id}
                  className="card group grid grid-cols-[1fr_60px_18px] items-center gap-3 p-3.5 hover:border-[#9EC9F3] hover:bg-[#F4F8FD]/50 sm:grid-cols-[minmax(220px,1.5fr)_100px_220px_24px] sm:gap-4 transition"
                >
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
                    <div className="min-w-0 flex-1">
                      <strong className="block truncate text-sm font-bold text-[#173A5E] group-hover:text-[#2F78C8] transition">
                        {p.name}
                      </strong>
                      <small className="block truncate text-xs text-[#5A7799]">
                        {p.code} · {p.diagnosis}
                      </small>
                    </div>
                  </div>

                  <div className="text-center">
                    <small className="block text-[11px] text-[#5A7799]">
                      SpO₂
                    </small>
                    <b
                      className={`text-sm ${p.spo2 < 90 ? "font-extrabold text-red-500" : "text-[#173A5E]"}`}
                    >
                      {p.spo2}%
                    </b>
                  </div>

                  <div className="hidden min-w-0 text-center sm:block">
                    <small className="block text-[11px] text-[#5A7799] mb-1">
                      Âm phổi AI
                    </small>
                    <div className="truncate text-sm flex justify-center">
                      <SoundLabel value={p.sound} />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight
                      size={16}
                      className="text-[#9EC9F3] transition-transform group-hover:translate-x-0.5"
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
        <section className="card p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-sm font-bold">Xu hướng SpO₂</h2>
                <div className="flex rounded-xl bg-[#F1F6FB] p-1 text-xs">
                  {(
                    [
                      ["24h", "24 giờ"],
                      ["7d", "7 ngày"],
                      ["30d", "30 ngày"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSpo2Range(id)}
                      className={`rounded-lg px-3 py-1 font-medium transition ${
                        spo2Range === id
                          ? "bg-white font-bold text-[#173A5E] shadow-sm"
                          : "text-[#5A7799] hover:text-[#2F78C8]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-xs text-[#5A7799]">
                Dữ liệu liên tục từ cảm biến SpO₂ bệnh nhân{" "}
                <Link
                  href="/patients/PAT-001?tab=spo2"
                  className="font-bold text-[#173A5E] underline decoration-[#9EC9F3] hover:text-[#2F78C8]"
                >
                  Trần Văn Mạnh
                </Link>
              </p>
            </div>
            <span className="text-xs text-[#2F78C8]">
              — SpO₂ (%) &nbsp; <i className="text-red-500">-- Ngưỡng 90%</i>
            </span>
          </div>
          <div className="mt-6">
            <Spo2Chart data={spo2DataByRange[spo2Range]} />
          </div>
        </section>
      </div>
      <StartVisitModal open={open} onClose={() => setOpen(false)} startVisit />
    </>
  );
}
