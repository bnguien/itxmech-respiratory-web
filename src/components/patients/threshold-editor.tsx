"use client";

import { useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { MonitoringThresholds, StoredConfig } from "@/lib/monitoring/config";

interface ConfigPayload {
  current: StoredConfig;
  history: StoredConfig[];
  device: { device_id: string; applied_version: number; config_status: string | null; last_seen_at: string | null } | null;
}

const T_OPTIONS = Array.from({ length: 11 }, (_, i) => 85 + i);
const dateFormat = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Bác sĩ sửa ngưỡng theo dõi SpO₂. Lưu tạo version mới; app người nhà ghi xuống vòng qua BLE và báo lại,
 * khi đó trạng thái chuyển sang "Vòng đã áp dụng". Firmware kiểm tra lại đúng các điều kiện ở đây.
 */
export function ThresholdEditor({
  patientId,
  onClose,
  onSaved,
}: {
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [payload, setPayload] = useState<ConfigPayload | null>(null);
  const [form, setForm] = useState<MonitoringThresholds | null>(null);
  const [note, setNote] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void (async () => {
      const response = await fetch(`/api/patients/${patientId}/monitoring-config`, { cache: "no-store" });
      const body = (await response.json()) as { data?: ConfigPayload; error?: { message?: string } };
      if (!active) return;
      if (!response.ok || !body.data) {
        setError(body.error?.message || "Không thể tải ngưỡng theo dõi.");
        return;
      }
      setPayload(body.data);
      setForm(body.data.current.thresholds);
    })();
    return () => {
      active = false;
    };
  }, [patientId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !saving && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const set = <K extends keyof MonitoringThresholds>(key: K, value: MonitoringThresholds[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const num = (value: string) => (value === "" ? 0 : Number(value));

  async function save() {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/patients/${patientId}/monitoring-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, watch_k: form.alert_k, watch_n: form.alert_n, preset: "custom", note }),
      });
      const body = (await response.json()) as { error?: { message?: string; details?: Array<{ message: string }> } };
      if (!response.ok) throw new Error(body.error?.details?.[0]?.message || body.error?.message || "Không thể lưu ngưỡng.");
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu ngưỡng.");
    } finally {
      setSaving(false);
    }
  }

  const field = "field mt-1";
  const label = "text-xs font-semibold text-[#5A7799]";

  return (
    <div
      role="presentation"
      onClick={(event) => event.target === event.currentTarget && !saving && onClose()}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#173A5E]/45 p-4 backdrop-blur-sm"
    >
      <div role="dialog" aria-modal="true" aria-labelledby="threshold-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#E7F1FB] p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-[#E7F1FB] p-3 text-[#2F78C8]"><SlidersHorizontal size={20} /></span>
            <div>
              <h2 id="threshold-title" className="font-bold text-[#173A5E]">Ngưỡng theo dõi SpO₂</h2>
              <p className="mt-1 text-xs text-[#5A7799]">
                {payload
                  ? `Đang đặt v${payload.current.version}${payload.current.setBy ? ` · ${payload.current.setBy}` : ""}`
                  : "Đang tải…"}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="rounded-lg p-1.5 text-[#5A7799] hover:bg-[#F4F8FD]">
            <X size={19} />
          </button>
        </div>

        {form && (
          <div className="space-y-5 p-5">
            <div>
              <span className={label}>Ngưỡng T (SpO₂ cần tránh)</span>
              <div className="mt-2 grid grid-cols-6 gap-2 sm:grid-cols-11">
                {T_OPTIONS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((prev) => (prev ? { ...prev, T: t, crit_T: Math.min(prev.crit_T, t - 1) } : prev))}
                    className={`rounded-lg border py-2 text-sm font-bold ${form.T === t ? "border-[#2F78C8] bg-[#2F78C8] text-white" : "border-[#DDE8F4] text-[#173A5E] hover:bg-[#F4F8FD]"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs text-[#5A7799]">
                Vòng báo <b>Cảnh báo</b> khi SpO₂ dưới {form.T}% liên tục 3 phút, và AI ước tính nguy cơ SpO₂ xuống dưới {form.T}% trong 30 phút tới.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Ngưỡng nguy hiểm (%)
                <input type="number" min={70} max={form.T - 1} value={form.crit_T} onChange={(e) => set("crit_T", num(e.target.value))} className={field} />
              </label>
              <label className={label}>
                Liên tục bao nhiêu phút
                <input type="number" min={1} max={10} value={form.crit_n_min} onChange={(e) => set("crit_n_min", num(e.target.value))} className={field} />
              </label>
              <label className={label}>
                Nhịp tim thấp (0 = tắt)
                <input type="number" min={0} max={80} value={form.hr_low} onChange={(e) => set("hr_low", num(e.target.value))} className={field} />
              </label>
              <label className={label}>
                Nhịp tim cao (0 = tắt)
                <input type="number" min={0} max={220} value={form.hr_high} onChange={(e) => set("hr_high", num(e.target.value))} className={field} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm font-semibold text-[#173A5E]">
              <input type="checkbox" checked={form.ml_enabled} onChange={(e) => set("ml_enabled", e.target.checked)} />
              Bật AI dự đoán nguy cơ (tắt thì vòng chỉ cảnh báo theo luật)
            </label>

            <button type="button" onClick={() => setAdvanced((v) => !v)} className="text-xs font-bold text-[#2F78C8]">
              {advanced ? "Ẩn tùy chọn nâng cao" : "Tùy chọn nâng cao"}
            </button>
            {advanced && (
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-[#F8FBFE] p-4">
                <label className={label}>
                  Báo lại Cảnh báo sau (phút)
                  <input type="number" min={5} max={240} value={form.alert_cooldown} onChange={(e) => set("alert_cooldown", num(e.target.value))} className={field} />
                </label>
                <label className={label}>
                  Báo lại Theo dõi sau (phút)
                  <input type="number" min={5} max={240} value={form.watch_cooldown} onChange={(e) => set("watch_cooldown", num(e.target.value))} className={field} />
                </label>
                <label className={label}>
                  AI: số lần vượt ngưỡng (k)
                  <input type="number" min={1} max={16} value={form.alert_k} onChange={(e) => set("alert_k", num(e.target.value))} className={field} />
                </label>
                <label className={label}>
                  trong số lần đánh giá (n)
                  <input type="number" min={1} max={16} value={form.alert_n} onChange={(e) => set("alert_n", num(e.target.value))} className={field} />
                </label>
                <label className={label}>
                  Chu kỳ vòng tự gửi WiFi (phút)
                  <input type="number" min={1} max={60} value={form.upload_interval_min} onChange={(e) => set("upload_interval_min", num(e.target.value))} className={field} />
                </label>
              </div>
            )}

            <label className={`${label} block`}>
              Ghi chú lý do đổi ngưỡng <em className="font-normal">(không bắt buộc)</em>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} className={field} placeholder="Ví dụ: COPD, mục tiêu SpO₂ 88–92%" />
            </label>

            {payload && payload.history.length > 0 && (
              <div className="rounded-2xl border border-[#E7F1FB] p-4">
                <p className="text-xs font-bold text-[#173A5E]">Lịch sử</p>
                <ul className="mt-2 space-y-1 text-xs text-[#5A7799]">
                  {payload.history.slice(0, 5).map((h) => (
                    <li key={h.version}>
                      v{h.version} · T {h.thresholds.T}% · nguy hiểm {h.thresholds.crit_T}%
                      {h.updatedAt ? ` · ${dateFormat.format(new Date(h.updatedAt))}` : ""}
                      {h.setBy ? ` · ${h.setBy}` : ""}
                      {payload.device && payload.device.applied_version >= h.version ? " · vòng đã áp dụng" : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-[#5A7799]">
              {payload?.device
                ? `Vòng ${payload.device.device_id} nhận ngưỡng mới khi app của người nhà đang kết nối vòng.`
                : "Bệnh nhân chưa có vòng. Ngưỡng được lưu và gửi xuống khi vòng kết nối lần đầu."}
            </p>
          </div>
        )}

        {error && <p className="px-5 pb-2 text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[#E7F1FB] p-5">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary">Hủy</button>
          <button type="button" onClick={() => void save()} disabled={saving || !form} className="btn-primary">
            {saving ? "Đang lưu..." : "Lưu ngưỡng mới"}
          </button>
        </div>
      </div>
    </div>
  );
}
