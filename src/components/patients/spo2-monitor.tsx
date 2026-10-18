"use client";

import { useMemo, useState } from "react";
import { Spo2Chart } from "@/components/dashboard/spo2-chart";
import { WearableLevelBadge } from "@/components/ui/status-badge";
import {
  mockAssessments,
  mockMonitoringConfig,
  mockTelemetry,
  mockWearableStatus,
  spo2DataByRange,
} from "@/constants/spo2";
import {
  MODEL_EVAL_EVERY_MIN,
  MODEL_WINDOW_MIN,
  RULE_EVENT_MIN,
  assessmentTriggerLabels,
  formatClock,
  formatProb,
  formatSpo2,
  minutesUntilModelReady,
  riskThresholds,
  summarizeSamples,
  transportLabels,
} from "@/lib/wearable/presentation";
import type {
  Assessment,
  MonitoringConfig,
  TelemetrySample,
  WearableStatus,
} from "@/types/wearable";

type Range = "24h" | "7d" | "30d";
const ranges: Array<{ id: Range; label: string }> = [
  { id: "24h", label: "24 giờ" },
  { id: "7d", label: "7 ngày" },
  { id: "30d", label: "30 ngày" },
];

function RiskBar({ prob, T }: { prob: number; T: number }) {
  const thresholds = riskThresholds(T);
  // Thang hiển thị 0–60 % để hai vạch ngưỡng không dồn vào góc trái.
  const scale = (value: number) => `${Math.min(100, (value / 0.6) * 100)}%`;
  const color = prob >= thresholds.alert ? "#F97316" : prob >= thresholds.watch ? "#F59E0B" : "#22C55E";
  return (
    <div className="mt-3">
      <div className="relative h-2 rounded-full bg-[#E6EEF7]">
        <div className="h-2 rounded-full" style={{ width: scale(prob), backgroundColor: color }} />
        <i aria-hidden="true" className="absolute -top-1 h-4 w-0.5 bg-amber-500" style={{ left: scale(thresholds.watch) }} />
        <i aria-hidden="true" className="absolute -top-1 h-4 w-0.5 bg-orange-600" style={{ left: scale(thresholds.alert) }} />
      </div>
      <p className="mt-2 text-xs text-[#5A7799]">
        Ngưỡng Theo dõi {formatProb(thresholds.watch)} · Cảnh báo {formatProb(thresholds.alert)}
      </p>
    </div>
  );
}

export function Spo2Monitor({
  samples = mockTelemetry,
  assessments = mockAssessments,
  status = mockWearableStatus,
  config = mockMonitoringConfig,
}: {
  samples?: TelemetrySample[];
  assessments?: Assessment[];
  status?: WearableStatus;
  config?: MonitoringConfig;
}) {
  const [range, setRange] = useState<Range>("24h");
  const data = spo2DataByRange[range];
  const latest = assessments.at(-1);
  const latestModelRun = assessments.findLast((item) => item.ran_model);
  const waitMinutes = minutesUntilModelReady(samples);
  const configPending = config.applied_version !== config.version;

  const summary = useMemo(() => {
    if (range === "24h") return summarizeSamples(samples);
    const values = data.map((point) => point.value);
    return {
      current: values.at(-1) ?? null,
      average: values.reduce((total, value) => total + value, 0) / values.length,
      highest: Math.max(...values),
      lowest: Math.min(...data.map((point) => point.min ?? point.value)),
      validMinutes: null,
    };
  }, [data, range, samples]);

  const events = useMemo(
    () =>
      // Chỉ giữ các lần đổi mức hoặc đổi nguyên nhân (ví dụ AI báo trước, sau đó luật xác nhận).
      assessments
        .filter((item, index, list) => {
          const previous = list[index - 1];
          return !previous || item.level !== previous.level || item.trigger !== previous.trigger;
        })
        .slice(-12)
        .reverse(),
    [assessments],
  );

  return (
    <section className="card mt-8 p-6 sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold">Theo dõi SpO₂</h2>
          <p className="mt-1 text-sm text-[#5A7799]">
            Vòng {status.device_id} · {transportLabels[status.transport]} · pin {status.battery}% · cập nhật {formatClock(status.ts)}
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

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">Mức hiện tại</small>
          <div className="mt-2">{latest ? <WearableLevelBadge level={latest.level} /> : <WearableLevelBadge level="UNKNOWN" />}</div>
          <p className="mt-3 text-sm font-semibold text-[#173A5E]">
            {latest ? assessmentTriggerLabels[latest.trigger] : "Chưa nhận dữ liệu từ vòng"}
          </p>
          {latest && <p className="mt-1 text-xs text-[#8BBCEC]">Đánh giá lúc {formatClock(latest.ts)}</p>}
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">Nguy cơ SpO₂ &lt; {config.T}% trong 30 phút tới</small>
          {config.ml_enabled && latestModelRun?.prob != null ? (
            <>
              <p className="mt-1 text-3xl font-extrabold text-[#173A5E]">{formatProb(latestModelRun.prob)}</p>
              <RiskBar prob={latestModelRun.prob} T={config.T} />
              <p className="mt-1 text-xs text-[#8BBCEC]">AI chạy mỗi {MODEL_EVAL_EVERY_MIN} phút · lần cuối {formatClock(latestModelRun.ts)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#5A7799]">
              {!config.ml_enabled
                ? "AI đang tắt, vòng chỉ cảnh báo theo luật."
                : `AI cần ${MODEL_WINDOW_MIN} phút dữ liệu liên tục${waitMinutes > 0 ? `, còn ${waitMinutes} phút` : ""}. Luật ngưỡng vẫn hoạt động.`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">SpO₂ · nhịp mạch</small>
          <p className={`mt-1 text-3xl font-extrabold ${latest?.spo2_now != null && latest.spo2_now < config.T ? "text-red-500" : "text-[#173A5E]"}`}>
            {formatSpo2(latest?.spo2_now ?? null)}
            <span className="ml-2 text-base font-bold text-[#5A7799]">{latest?.pulse_now != null ? `${latest.pulse_now} nhịp/phút` : ""}</span>
          </p>
          <p className="mt-3 text-xs text-[#5A7799]">
            Mức nền 24 giờ: <b className="text-[#173A5E]">{formatSpo2(latest?.baseline ?? null)}</b>
            {latest && latest.base_hours < 24 && latest.baseline !== null ? ` (đủ ${Math.floor(latest.base_hours)} giờ)` : ""}
          </p>
          <p className="mt-1 text-xs text-[#5A7799]">{status.worn ? "Đang đeo vòng" : "Vòng chưa được đeo"}</p>
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">Ngưỡng đang áp dụng</small>
          <p className="mt-1 text-3xl font-extrabold text-[#173A5E]">T = {config.T}%</p>
          <ul className="mt-2 space-y-1 text-xs text-[#5A7799]">
            <li>Cảnh báo theo luật: dưới T liên tục ≥ {RULE_EVENT_MIN} phút</li>
            <li>Nguy hiểm: SpO₂ &lt; {config.critical.crit_T}% trong {config.critical.n_min} phút hoặc mạch ngoài {config.critical.hr_low}–{config.critical.hr_high}</li>
            <li className={configPending ? "font-semibold text-amber-700" : ""}>
              {configPending ? `Đang chờ vòng áp dụng cấu hình v${config.version}` : `Vòng đã áp dụng cấu hình v${config.version}`}
            </li>
            <li className="font-mono text-[11px] text-[#8BBCEC]">{status.model_version} · fw {status.fw}</li>
          </ul>
        </div>
      </div>

      <div className="mt-10">
        <Spo2Chart data={data} threshold={config.T} criticalThreshold={config.critical.crit_T} />
      </div>
      <p className="mt-2 text-xs text-[#5A7799]">
        — SpO₂ trung bình &nbsp; <span className="text-[#7FB2E5]">- - thấp nhất</span> &nbsp; <i className="text-red-500">- - ngưỡng T</i>
        {range !== "24h" && " · Dữ liệu 7/30 ngày là trung bình theo ngày"}
      </p>

      <div className="mt-8 grid grid-cols-2 rounded-2xl border border-[#DDE8F4] bg-[#F2F7FD] py-6 text-center sm:grid-cols-4">
        {[
          ["Hiện tại", summary?.current ?? null, "text-[#173A5E]"],
          ["Trung bình", summary?.average ?? null, "text-[#173A5E]"],
          ["Cao nhất", summary?.highest ?? null, "text-[#2F78C8]"],
          ["Thấp nhất", summary?.lowest ?? null, "text-red-500"],
        ].map(([label, value, color]) => (
          <div key={label as string}>
            <small className="text-[#5A7799]">{label}</small>
            <p className={`mt-1 text-2xl font-extrabold ${color}`}>{formatSpo2(value as number | null)}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-9 font-bold">Nhật ký đánh giá của vòng</h3>
      <p className="mt-1 text-xs text-[#5A7799]">Các lần đổi mức hoặc nguyên nhân trong 24 giờ, mới nhất ở trên</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-[#DDE8F4]">
        {events.length === 0 ? (
          <p className="px-5 py-6 text-sm text-[#5A7799]">Không có cảnh báo trong 24 giờ.</p>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-[#F2F7FD] text-left text-xs text-[#5A7799]">
              <tr>
                <th className="px-5 py-3 font-semibold">Thời gian</th>
                <th className="px-5 py-3 font-semibold">Mức</th>
                <th className="px-5 py-3 font-semibold">Nguyên nhân</th>
                <th className="px-5 py-3 text-right font-semibold">SpO₂</th>
                <th className="px-5 py-3 text-right font-semibold">Mạch</th>
                <th className="px-5 py-3 text-right font-semibold">Nguy cơ AI</th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.seq} className="border-t border-[#E6EEF7]">
                  <td className="px-5 py-3 font-mono text-[#5A7799]">{formatClock(item.ts)}</td>
                  <td className="px-5 py-3"><WearableLevelBadge level={item.level} /></td>
                  <td className="px-5 py-3 text-[#173A5E]">{assessmentTriggerLabels[item.trigger]}</td>
                  <td className={`px-5 py-3 text-right font-bold ${item.spo2_now != null && item.spo2_now < item.T ? "text-red-500" : "text-[#173A5E]"}`}>{formatSpo2(item.spo2_now)}</td>
                  <td className="px-5 py-3 text-right text-[#173A5E]">{item.pulse_now ?? "—"}</td>
                  <td className="px-5 py-3 text-right text-[#173A5E]">{formatProb(item.prob)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
