"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { WearableRange } from "@/lib/wearable/chart";
import type { PatientWearableData } from "@/lib/wearable/server";

/** Gom các sự kiện Realtime dồn dập (BACKFILL gửi hàng chục bản ghi một lúc) thành một lần tải lại. */
const REFETCH_DEBOUNCE_MS = 1500;

/**
 * SpO₂ thật của bệnh nhân cho trang bác sĩ. Tải qua `GET /api/patients/{id}/wearable`, rồi nghe Supabase Realtime
 * trên `vitals_minute` / `assessments` (lọc theo bệnh nhân) và `wearable_devices`: có thay đổi thì tải lại.
 * Payload Realtime chỉ dùng để biết "có dữ liệu mới", không dùng làm dữ liệu hiển thị.
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

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const invalidate = () => {
      if (!active) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), REFETCH_DEBOUNCE_MS);
    };
    let channel = supabase
      .channel(`wearable:${patientId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vitals_minute", filter: `patient_id=eq.${patientId}` }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assessments", filter: `patient_id=eq.${patientId}` }, invalidate);
    if (deviceId) {
      channel = channel.on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "wearable_devices", filter: `device_id=eq.${deviceId}` },
        invalidate,
      );
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
