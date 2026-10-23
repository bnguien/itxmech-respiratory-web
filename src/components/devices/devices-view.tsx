"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, Battery } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useNowSeconds } from "@/lib/wearable/use-now";
import { formatClock, wearableConnection } from "@/lib/wearable/presentation";
import type { WearableTransport } from "@/types/wearable";

interface DeviceRow {
  device_id: string;
  battery_pct: number | null;
  worn: boolean | null;
  last_seen_at: string | null;
  transport: string | null;
  fw: string | null;
  applied_config_version: number;
  patient_id: string | null;
  patient_name: string | null;
  patient_code: string | null;
}

const toneStyles = {
  ok: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  info: "bg-sky-50 text-sky-800 border-sky-200/80",
  warn: "bg-amber-50 text-amber-800 border-amber-200/80",
  bad: "bg-red-50 text-red-600 border-red-200/80",
  muted: "bg-[#F4F8FD] text-[#5A7799] border-[#E7F1FB]",
} as const;

/** Vòng đeo SpO₂ thật (bảng wearable_devices), trạng thái kết nối tính từ lần cuối server nhận dữ liệu. */
export function DevicesView() {
  const [devices, setDevices] = useState<DeviceRow[] | null>(null);
  const [error, setError] = useState("");
  const [unassigning, setUnassigning] = useState<string | null>(null);
  const now = useNowSeconds();

  const unassign = async (deviceId: string, patientName: string | null) => {
    if (!window.confirm(`Gỡ vòng ${deviceId} khỏi ${patientName ?? "bệnh nhân"}? Vòng sẽ gán cho bệnh nhân kế tiếp kết nối qua app.`)) return;
    setUnassigning(deviceId);
    setError("");
    try {
      const response = await fetch(`/api/devices/${encodeURIComponent(deviceId)}/assignment`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) throw new Error(payload.error?.message || "Không thể gỡ vòng.");
      setDevices((list) =>
        list?.map((d) => (d.device_id === deviceId ? { ...d, patient_id: null, patient_name: null, patient_code: null } : d)) ?? null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gỡ vòng.");
    } finally {
      setUnassigning(null);
    }
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/devices", { cache: "no-store" });
        const payload = (await response.json()) as { data?: DeviceRow[]; error?: { message?: string } };
        if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Không thể tải danh sách thiết bị.");
        if (active) {
          setDevices(payload.data);
          setError("");
        }
      } catch (caught) {
        if (active) setError(caught instanceof Error ? caught.message : "Không thể tải danh sách thiết bị.");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className="page w-full space-y-6">
      <PageHeader title="Thiết bị AIoT" description="Vòng đeo SpO₂ đã gửi dữ liệu lên hệ thống và bệnh nhân đang gán" />
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="card overflow-hidden">
        <div className="hidden grid-cols-[minmax(220px,2fr)_minmax(200px,1.5fr)_minmax(200px,1.4fr)_minmax(160px,1fr)] items-center gap-4 border-b border-[#E7F1FB] bg-[#F8FAFD] px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#5A7799] md:grid">
          <div>Mã thiết bị</div>
          <div>Bệnh nhân gán</div>
          <div>Kết nối</div>
          <div className="text-right">Pin & firmware</div>
        </div>
        <div className="divide-y divide-[#E7F1FB]">
          {devices?.map((d) => {
            const ts = d.last_seen_at ? Math.floor(new Date(d.last_seen_at).getTime() / 1000) : 0;
            const state =
              now === null
                ? null
                : wearableConnection(
                    { ts, transport: (d.transport === "wifi" ? "wifi" : "ble_relay") as WearableTransport, worn: d.worn ?? false },
                    now,
                  );
            return (
              <div
                key={d.device_id}
                className="flex flex-col items-start gap-3 px-5 py-3.5 transition hover:bg-[#F4F8FD]/70 md:grid md:grid-cols-[minmax(220px,2fr)_minmax(200px,1.5fr)_minmax(200px,1.4fr)_minmax(160px,1fr)] md:items-center md:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#9EC9F3]/40 bg-[#E7F1FB] text-[#2F78C8]">
                    <Activity size={19} />
                  </span>
                  <div className="min-w-0">
                    <b className="block font-mono text-xs text-[#173A5E]">{d.device_id}</b>
                    <span className="block text-[11px] text-[#5A7799]">Vòng đeo SpO₂ · ngưỡng v{d.applied_config_version}</span>
                  </div>
                </div>
                <div className="min-w-0">
                  {d.patient_id ? (
                    <>
                      <Link
                        href={`/patients/${d.patient_id}?tab=spo2`}
                        className="block truncate text-xs font-bold text-[#173A5E] transition hover:text-[#2F78C8]"
                      >
                        {d.patient_name} <span className="font-mono font-normal text-[#5A7799]">{d.patient_code}</span>
                      </Link>
                      <button
                        type="button"
                        disabled={unassigning === d.device_id}
                        onClick={() => void unassign(d.device_id, d.patient_name)}
                        className="mt-1 text-[11px] font-bold text-red-600 hover:underline disabled:opacity-50"
                      >
                        {unassigning === d.device_id ? "Đang gỡ…" : "Gỡ khỏi bệnh nhân"}
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-[#5A7799]">Chưa gán</span>
                  )}
                </div>
                <div>
                  {state && (
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${toneStyles[state.tone]}`}>
                      {state.title}
                    </span>
                  )}
                  <span className="mt-1 block text-[11px] text-[#5A7799]">{ts ? `Lần cuối ${formatClock(ts)}` : "Chưa gửi dữ liệu"}</span>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[#173A5E]">
                    <Battery size={15} className={d.battery_pct !== null && d.battery_pct < 20 ? "text-red-500" : "text-[#2F78C8]"} />
                    {d.battery_pct !== null ? `${d.battery_pct}%` : "—"}
                  </span>
                  <span className="text-[11px] text-[#5A7799]">{d.fw ? `fw ${d.fw}` : "—"}</span>
                </div>
              </div>
            );
          })}
          {devices && devices.length === 0 && (
            <p className="p-12 text-center text-xs text-[#5A7799]">
              Chưa có vòng nào gửi dữ liệu. Vòng xuất hiện ở đây sau khi người nhà kết nối vòng trên app.
            </p>
          )}
          {!devices && !error && <p className="p-12 text-center text-xs text-[#5A7799]">Đang tải…</p>}
        </div>
      </div>
      <p className="text-xs text-[#5A7799]">
        Ống nghe số được điều khiển qua MQTT trong màn khám bệnh; trạng thái của ống nghe hiện ở bước ghi âm của lần khám.
      </p>
    </div>
  );
}
