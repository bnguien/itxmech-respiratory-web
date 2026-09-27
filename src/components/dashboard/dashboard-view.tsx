"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { doctor, patients } from "@/constants/mock-data";
import { SoundLabel } from "@/components/ui/status-badge";
import { Spo2Chart } from "./spo2-chart";
import { StartVisitModal } from "@/components/visits/start-visit-modal";
import { spo2DataByRange } from "@/constants/spo2";

export function DashboardView() {
  const [open, setOpen] = useState(false);
  const [spo2Range, setSpo2Range] = useState<"24h" | "7d" | "30d">("24h");
  const attention = patients.filter((p) => p.needsAttention);
  return (
    <>
      <div className="page max-w-5xl space-y-7">
        <section className="relative flex min-h-48 items-center justify-between overflow-hidden rounded-3xl border border-[#9EC9F3]/30 bg-gradient-to-r from-[#F4F8FD] to-[#E7F1FB]/60 p-7">
          <div className="relative z-10">
            <span className="eyebrow">Bảng điều khiển</span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Xin chào, <span className="text-[#2F78C8]">{doctor.name}</span>!
            </h1>
            <p className="mt-2 text-sm text-[#5A7799]">
              Hôm nay có{" "}
              <strong className="text-red-500">
                {attention.length} bệnh nhân
              </strong>{" "}
              cần được chú ý.
            </p>
            <button onClick={() => setOpen(true)} className="btn-primary mt-5">
              <Plus size={16} />
              Bắt đầu khám
            </button>
          </div>
          <div className="absolute -bottom-10 right-5 flex h-48 w-48 items-center justify-center sm:static">
            <Image
              src="/images/dashboard.png"
              alt="Ống nghe kết hợp phổi và sóng hô hấp"
              width={160}
              height={134}
              className="h-auto w-40 object-contain"
              priority
            />
          </div>
        </section>
        <div className="grid gap-7 lg:grid-cols-12">
          <section className="lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold">Bệnh nhân cần chú ý</h2>
              <Link
                href="/patients"
                className="text-xs font-bold text-[#2F78C8]"
              >
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
                    className="card group grid grid-cols-[1fr_60px_18px] items-center gap-3 p-3.5 hover:border-[#9EC9F3] hover:bg-[#F4F8FD]/50 sm:grid-cols-[1fr_68px_175px_18px] sm:gap-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#9EC9F3]/40 bg-[#E7F1FB] text-xs font-bold">
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
                        <strong className="block truncate text-sm group-hover:text-[#2F78C8]">
                          {p.name}
                        </strong>
                        <small className="block truncate text-[#5A7799]">
                          {p.code} · {p.diagnosis}
                        </small>
                      </div>
                    </div>

                    <div className="text-right">
                      <small className="block text-[11px] text-[#5A7799]">SpO₂</small>
                      <b className={`text-sm ${p.spo2 < 90 ? "font-extrabold text-red-500" : "text-[#173A5E]"}`}>
                        {p.spo2}%
                      </b>
                    </div>

                    <div className="hidden min-w-0 text-right sm:block">
                      <small className="block text-[11px] text-[#5A7799]">Âm phổi AI</small>
                      <div className="truncate text-sm">
                        <SoundLabel value={p.sound} />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <ChevronRight size={16} className="text-[#9EC9F3] transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          <aside className="space-y-5 lg:col-span-5">
            <h2 className="text-sm font-bold">Theo dõi hôm nay</h2>
            <div className="grid grid-cols-2 rounded-2xl border border-[#9EC9F3]/30 bg-[#F4F8FD] p-5">
              <Link
                href="/patients?filter=spo2"
                className="group block transition hover:opacity-85"
              >
                <small className="text-[#5A7799] group-hover:text-[#2F78C8]">
                  SpO₂ thấp
                </small>
                <p className="mt-1 text-2xl font-extrabold text-red-500">
                  2{" "}
                  <span className="text-xs font-normal text-[#5A7799]">
                    bệnh nhân
                  </span>
                </p>
              </Link>
              <Link
                href="/recordings?filter=pending"
                className="group block border-l border-[#9EC9F3]/40 pl-4 transition hover:opacity-85"
              >
                <small className="text-[#5A7799] group-hover:text-[#2F78C8]">
                  Bản ghi chờ duyệt
                </small>
                <p className="mt-1 text-2xl font-extrabold text-[#2F78C8]">
                  3{" "}
                  <span className="text-xs font-normal text-[#5A7799]">
                    bản ghi
                  </span>
                </p>
              </Link>
            </div>
            <div className="card p-5">
              <div className="mb-4 flex justify-between text-xs font-bold">
                <span>Phân tích âm phổi</span>
                <Link
                  href="/recordings"
                  className="font-normal text-[#9EC9F3] hover:text-[#2F78C8]"
                >
                  Toàn bộ bản ghi
                </Link>
              </div>
              {[
                ["Normal", 30, "#2F78C8"],
                ["Crackles", 39, "#F59E0B"],
                ["Wheezes", 17, "#6366F1"],
                ["Crackles + Wheezes", 14, "#EF4444"],
              ].map(([n, v, c]) => (
                <Link
                  key={n as string}
                  href={`/recordings?filter=${encodeURIComponent(n as string)}`}
                  className="group mb-3 block transition hover:opacity-85"
                >
                  <div className="mb-1 flex justify-between text-xs text-[#5A7799]">
                    <span className="group-hover:text-[#2F78C8]">{n}</span>
                    <b className="text-[#173A5E]">{v}%</b>
                  </div>
                  <div className="h-1.5 rounded bg-[#E7F1FB]">
                    <div
                      className="h-full rounded"
                      style={{ width: `${v}%`, background: c as string }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>
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
      <StartVisitModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
