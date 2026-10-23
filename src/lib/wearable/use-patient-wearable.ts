"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WearableRange } from "@/lib/wearable/chart";
import type { PatientWearableData } from "@/lib/wearable/server";

/** Gom các sự kiện Realtime dồn dập (BACKFILL gửi hàng chục bản ghi một lúc) thành một lần tải lại. */
const REFETCH_DEBOUNCE_MS = 1500;
/** Realtime đứt (mạng bệnh viện chặn websocket, Supabase khởi động lại…) thì tự tải lại theo chu kỳ này. */
const FALLBACK_POLL_MS = 30_000;

const toEpoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

interface LiveRow {
  device_id: string;
  ts: string;
  spo2: number | null;
  spo2_min: number | null;
  pulse: number | null;
  valid: number;
  worn: boolean;
  received_at: string;
}

/**
 * SpO₂ thật của bệnh nhân cho trang bác sĩ. Tải qua `GET /api/patients/{id}/wearable`, rồi nghe Supabase Realtime
 * trên `vitals_minute` / `assessments` (lọc theo bệnh nhân) và `wearable_devices`: có thay đổi thì tải lại.
 * Riêng `wearable_live` (số 15 giây, ghi đè mỗi 15 s) cập nhật tại chỗ từ payload, không tải lại cả trang.
 * Realtime không nối được thì tải lại mỗi 30 giây, để trang không đứng ở số cũ.
 */
export function usePatientWearable(patientId: string, range: WearableRange) {
  const [data, setData] = useState<PatientWearableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const timer = useRef<number | null>(null);
  const deviceId = data?.device?.device_id ?? null;

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/patients/${patientId}/wearable?range=${range}`, { cache: "no-store" });
      const payload = (await response.json()) as { data?: PatientWearableData; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Không thể tải dữ liệu SpO₂.");
      setData(payload.data);
      setError("");
    } catch (caught) {
      // Giữ dữ liệu cũ trên màn hình; banner kết nối tự chuyển sang "gián đoạn / mất kết nối" theo thời gian.
      setError(caught instanceof Error ? caught.message : "Không thể tải dữ liệu SpO₂.");
    } finally {
      setLoading(false);
    }
  }, [patientId, range]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    void load();
  }, [load]);

  // Dự phòng khi Realtime không chạy, và tải lại ngay khi bác sĩ quay lại tab.
  useEffect(() => {
    const poll = window.setInterval(() => {
      if (!live && document.visibilityState === "visible") void load();
    }, FALLBACK_POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [live, load]);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const invalidate = () => {
      if (!active) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), REFETCH_DEBOUNCE_MS);
    };
    const onLive = (payload: { new: Partial<LiveRow> }) => {
      const row = payload.new;
      if (!active || !row?.ts || !row.received_at) return;
      const ts = toEpoch(row.ts);
      const received = toEpoch(row.received_at);
      setData((prev) =>
        prev && (!prev.live || prev.live.ts <= ts)
          ? {
              ...prev,
              live: {
                ts,
                spo2: row.spo2 ?? null,
                spo2_min: row.spo2_min ?? null,
                pulse: row.pulse ?? null,
                worn: !!row.worn,
                valid: row.valid ?? 0,
              },
              device: prev.device ? { ...prev.device, ts: Math.max(prev.device.ts, received), worn: !!row.worn } : prev.device,
            }
          : prev,
      );
    };
    let channel = supabase
      .channel(`wearable:${patientId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vitals_minute", filter: `patient_id=eq.${patientId}` }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assessments", filter: `patient_id=eq.${patientId}` }, invalidate);
    if (deviceId) {
      channel = channel
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "wearable_devices", filter: `device_id=eq.${deviceId}` },
          invalidate,
        )
        .on("postgres_changes", { event: "*", schema: "public", table: "wearable_live", filter: `device_id=eq.${deviceId}` }, onLive);
    }
    channel.subscribe((status) => {
      if (!active) return;
      setLive(status === "SUBSCRIBED");
      if (status === "SUBSCRIBED") invalidate();
    });
    return () => {
      active = false;
      if (timer.current) window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [patientId, deviceId, load]);

  return { data, loading, error, live, reload: load };
}
