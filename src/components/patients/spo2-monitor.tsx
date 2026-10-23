"use client";

import { useMemo, useState } from "react";
import { Spo2Chart } from "@/components/dashboard/spo2-chart";
import { ThresholdEditor } from "@/components/patients/threshold-editor";
import { WearableLevelBadge } from "@/components/ui/status-badge";
import { RANGE_SPEC, WEARABLE_RANGES, hasChartData, summarizeChart, type WearableRange } from "@/lib/wearable/chart";
import { WearableConnectionBanner, useCurrentReading } from "./wearable-connection";
import { DeviceDiagnosticsPanel } from "./device-diagnostics";
import type { PatientWearableData } from "@/lib/wearable/server";
import {
  LIVE_PERIOD_SECONDS,
  MODEL_EVAL_EVERY_MIN,
  MODEL_WINDOW_MIN,
  RULE_EVENT_MIN,
  assessmentTriggerLabels,
  formatClock,
  formatClockSeconds,
  formatProb,
  formatSpo2,
  minutesUntilModelReady,
  riskThresholds,
  summarizeSamples,
  transportLabels,
  wearableLevelStyles,
} from "@/lib/wearable/presentation";

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

/**
 * Tab SpO₂ của hồ sơ bệnh nhân: dữ liệu thật từ vòng (qua app gateway), cập nhật bằng Supabase Realtime.
 * Dữ liệu do PatientDetail tải một lần (usePatientWearable) và dùng chung với tab Tổng quan.
 */
export function Spo2Monitor({
  patientId,
  wearable,
  loading,
  error,
  live,
  range,
  onRangeChange,
  onConfigSaved,
  readOnly = false,
}: {
  patientId: string;
  wearable: PatientWearableData | null;
  loading: boolean;
  error: string;
  live: boolean;
  range: WearableRange;
  onRangeChange: (range: WearableRange) => void;
  onConfigSaved: () => void;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const current = useCurrentReading(wearable);
  const samples = useMemo(() => wearable?.samples ?? [], [wearable]);
  const assessments = useMemo(() => wearable?.assessments ?? [], [wearable]);
  const data = useMemo(() => wearable?.chart ?? [], [wearable]);
  const status = wearable?.device ?? null;
  const config = wearable?.config;
  const latest = assessments.at(-1);
  const reading = current?.reading ?? null;
  // Gián đoạn / mất kết nối: không hiển thị số và mức cũ như số hiện tại.
  const stale = !!current && !!status && !current.fresh;
  const latestModelRun = assessments.findLast((item) => item.ran_model);
  const waitMinutes = minutesUntilModelReady(samples);
  const configPending = !!config && config.applied_version !== null && config.applied_version < config.version;

  const summary = useMemo(() => {
    // 24 giờ: tính từ bản ghi phút gốc. Khoảng khác: từ các điểm biểu đồ có số đo (bỏ đoạn trống).
    if (range === "24h") return summarizeSamples(samples);
    const chart = summarizeChart(data);
    if (!chart) return null;
    return { ...chart, current: summarizeSamples(samples)?.current ?? chart.current, validMinutes: null };
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
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            Theo dõi SpO₂
            {live && <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-bold text-green-700">● Trực tiếp</span>}
          </h2>
          <p className="mt-1 text-sm text-[#5A7799]">
            {status
              ? `Vòng ${status.device_id} · ${transportLabels[status.transport]} · pin ${status.battery >= 0 ? `${status.battery}%` : "không rõ"} · lần cuối ${status.ts ? formatClock(status.ts) : "—"}`
              : loading
                ? "Đang tải dữ liệu vòng…"
                : "Chưa có vòng nào cho bệnh nhân này."}
          </p>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
        <div className="flex self-start rounded-xl border border-[#DDE8F4] bg-[#F1F6FB] p-1">
          {WEARABLE_RANGES.map((item) => (
            <button
              key={item.id}
              onClick={() => onRangeChange(item.id)}
              className={`rounded-lg px-5 py-2 text-sm ${range === item.id ? "bg-white font-bold text-[#173A5E] shadow-sm" : "text-[#5A7799]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <WearableConnectionBanner device={status} uploadIntervalMin={config?.upload_interval_min} loading={loading && !wearable} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">Mức hiện tại</small>
          {stale ? (
            <>
              <div className="mt-2"><WearableLevelBadge level="UNKNOWN" /></div>
              <p className="mt-3 text-sm font-semibold text-red-700">Mất kết nối – không nhận được tín hiệu SpO₂</p>
              {latest && (
                <p className="mt-1 text-xs text-[#8BBCEC]">
                  Đánh giá cuối lúc {formatClock(latest.ts)}: {wearableLevelStyles[latest.level].name}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="mt-2">{latest ? <WearableLevelBadge level={latest.level} /> : <WearableLevelBadge level="UNKNOWN" />}</div>
              <p className="mt-3 text-sm font-semibold text-[#173A5E]">
                {latest ? assessmentTriggerLabels[latest.trigger] : "Chưa nhận dữ liệu từ vòng"}
              </p>
              {latest && <p className="mt-1 text-xs text-[#8BBCEC]">Đánh giá lúc {formatClock(latest.ts)}</p>}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">Nguy cơ SpO₂ &lt; {config?.T ?? "T"}% trong 30 phút tới</small>
          {config?.ml_enabled && latestModelRun?.prob != null ? (
            <>
              <p className="mt-1 text-3xl font-extrabold text-[#173A5E]">{formatProb(latestModelRun.prob)}</p>
              <RiskBar prob={latestModelRun.prob} T={config.T} />
              <p className="mt-1 text-xs text-[#8BBCEC]">AI chạy mỗi {MODEL_EVAL_EVERY_MIN} phút · lần cuối {formatClock(latestModelRun.ts)}</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-[#5A7799]">
              {config && !config.ml_enabled
                ? "AI đang tắt, vòng chỉ cảnh báo theo luật."
                : `AI cần ${MODEL_WINDOW_MIN} phút dữ liệu liên tục${waitMinutes > 0 ? `, còn ${waitMinutes} phút` : ""}. Luật ngưỡng vẫn hoạt động.`}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <small className="text-[#5A7799]">SpO₂ · nhịp mạch</small>
          {stale ? (
            <>
              <p className="mt-1 text-3xl font-extrabold text-[#9EB4CC]">—</p>
              <p className="mt-1 text-xs font-semibold text-red-700">
                Không nhận được SpO₂{reading ? ` · số cuối ${formatSpo2(reading.spo2)} lúc ${formatClockSeconds(reading.ts)}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className={`mt-1 text-3xl font-extrabold ${reading?.spo2 != null && config && reading.spo2 < config.T ? "text-red-500" : "text-[#173A5E]"}`}>
                {formatSpo2(reading?.spo2 ?? null)}
                <span className="ml-2 text-base font-bold text-[#5A7799]">
                  {reading?.pulse != null ? `${Math.round(reading.pulse)} nhịp/phút` : ""}
                </span>
              </p>
              {reading && (
                // Cùng giờ đo với app người nhà: hai bên đối chiếu được đúng một số.
                <p className="mt-1 text-xs text-[#8BBCEC]">
                  Đo lúc {formatClockSeconds(reading.ts)} ·{" "}
                  {reading.source === "live" ? `trung bình ${LIVE_PERIOD_SECONDS} giây` : "trung bình 1 phút"}
                </p>
              )}
            </>
          )}
          <p className="mt-3 text-xs text-[#5A7799]">
            Mức nền 24 giờ: <b className="text-[#173A5E]">{formatSpo2(latest?.baseline ?? null)}</b>
            {latest && latest.base_hours < 24 && latest.baseline !== null ? ` (đủ ${Math.floor(latest.base_hours)} giờ)` : ""}
          </p>
          <p className="mt-1 text-xs text-[#5A7799]">{status ? (status.worn ? "Đang đeo vòng" : "Vòng chưa được đeo") : "Chưa có vòng"}</p>
        </div>

        <div className="rounded-2xl border border-[#DDE8F4] bg-[#F8FBFE] p-5">
          <div className="flex items-start justify-between gap-2">
            <small className="text-[#5A7799]">Ngưỡng theo dõi</small>
            {!readOnly && (
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-bold text-[#2F78C8] hover:underline">
                Sửa ngưỡng
              </button>
            )}
          </div>
          <p className="mt-1 text-3xl font-extrabold text-[#173A5E]">T = {config?.T ?? "—"}%</p>
          {config && (
            <ul className="mt-2 space-y-1 text-xs text-[#5A7799]">
              <li>Cảnh báo theo luật: dưới T liên tục ≥ {RULE_EVENT_MIN} phút</li>
              <li>
                Nguy hiểm: SpO₂ &lt; {config.critical.crit_T}% trong {config.critical.n_min} phút
                {config.critical.hr_low || config.critical.hr_high ? ` hoặc mạch ngoài ${config.critical.hr_low}–${config.critical.hr_high}` : ""}
              </li>
              <li className={configPending ? "font-semibold text-amber-700" : ""}>
                {config.version === 0
                  ? "Đang dùng ngưỡng mặc định (v0)"
                  : config.applied_version === null
                    ? `Cấu hình v${config.version} · chưa có vòng`
                    : configPending
                      ? `Đang chờ vòng áp dụng v${config.version} (vòng đang dùng v${config.applied_version})`
                      : `Vòng đã áp dụng v${config.version}`}
              </li>
              {status && <li className="font-mono text-[11px] text-[#8BBCEC]">{status.model_version} · fw {status.fw}</li>}
            </ul>
          )}
        </div>
      </div>

      <div className="mt-10">
        {hasChartData(data) ? (
          <Spo2Chart data={data} range={range} threshold={config?.T} criticalThreshold={config?.critical.crit_T} />
        ) : (
          <div className="flex h-[340px] items-center justify-center rounded-2xl border border-dashed border-[#DDE8F4] text-sm text-[#5A7799]">
            {loading ? "Đang tải…" : "Chưa có số đo SpO₂ trong khoảng này."}
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-[#5A7799]">
        — {range === "6h" ? "SpO₂ từng phút" : "SpO₂ trung bình"} &nbsp;
        {range !== "6h" && <span className="text-[#7FB2E5]">- - thấp nhất &nbsp;</span>}
        <i className="text-red-500">- - ngưỡng T</i> · {RANGE_SPEC[range].note} · Đoạn trống: không có số đo (mất kết nối hoặc không đeo vòng)
      </p>

      <div className="mt-8 grid grid-cols-2 rounded-2xl border border-[#DDE8F4] bg-[#F2F7FD] py-6 text-center sm:grid-cols-4">
        {[
          ["Hiện tại", stale ? null : (reading?.spo2 ?? summary?.current ?? null), "text-[#173A5E]"],
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
      <DeviceDiagnosticsPanel items={wearable?.diagnostics ?? []} />
      {editing && (
        <ThresholdEditor
          patientId={patientId}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            onConfigSaved();
          }}
        />
      )}
    </section>
  );
}
