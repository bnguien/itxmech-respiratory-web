"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DoctorAlert } from "@/lib/alerts/server";

/** Gom các sự kiện Realtime dồn dập (vòng gửi bù cả lô assessment) thành một lần tải lại. */
const REFETCH_DEBOUNCE_MS = 1000;
/** Dự phòng khi Realtime rớt: vẫn tải lại định kỳ. */
const POLL_MS = 60_000;
/** Thẻ Nguy hiểm chỉ giữ cảnh báo trong 24 giờ gần nhất (cũ hơn xem ở trang Cảnh báo). */
const CRITICAL_CARD_WINDOW_MS = 24 * 3600 * 1000;

interface WearableAlertsValue {
  alerts: DoctorAlert[];
  /** Chưa được bác sĩ xem (chuông). */
  unread: DoctorAlert[];
  /** CRITICAL chưa xem trong 24 giờ: hiện thẻ nổi bật trên mọi trang. */
  criticalOpen: DoctorAlert[];
  error: string;
  loaded: boolean;
  acknowledge: (id: string) => Promise<void>;
  acknowledgeAll: () => Promise<void>;
}

const WearableAlertsContext = createContext<WearableAlertsValue | null>(null);

/**
 * Một nguồn cảnh báo dùng chung cho chuông, thẻ Nguy hiểm và trang Cảnh báo: tải `GET /api/alerts`,
 * nghe Supabase Realtime trên `wearable_alerts`, có thay đổi thì tải lại.
 */
export function WearableAlertsProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<DoctorAlert[]>([]);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/alerts?limit=100", { cache: "no-store" });
      const payload = (await response.json()) as { data?: DoctorAlert[]; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Không thể tải cảnh báo.");
      setAlerts(payload.data);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải cảnh báo.");
    } finally {
      setLoaded(true);
      setNowMs(Date.now());
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const invalidate = () => {
      if (!active) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), REFETCH_DEBOUNCE_MS);
    };
    const channel = supabase
      .channel(`wearable-alerts:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wearable_alerts" }, invalidate)
      .subscribe((status) => {
        if (active && status === "SUBSCRIBED") invalidate();
      });
    const poll = window.setInterval(invalidate, POLL_MS);
    invalidate();
    return () => {
      active = false;
      if (timer.current) window.clearTimeout(timer.current);
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const acknowledge = useCallback(
    async (id: string) => {
      const at = new Date().toISOString();
      setAlerts((list) => list.map((alert) => (alert.id === id ? { ...alert, acknowledged_at: at, status: "ACKNOWLEDGED" } : alert)));
      const response = await fetch(`/api/alerts/${id}/acknowledge`, { method: "POST" }).catch(() => null);
      if (!response?.ok) await load();
    },
    [load],
  );

  const acknowledgeAll = useCallback(async () => {
    const at = new Date().toISOString();
    setAlerts((list) => list.map((alert) => (alert.acknowledged_at ? alert : { ...alert, acknowledged_at: at, status: "ACKNOWLEDGED" })));
    const response = await fetch("/api/alerts/acknowledge-all", { method: "POST" }).catch(() => null);
    if (!response?.ok) await load();
  }, [load]);

  const value = useMemo<WearableAlertsValue>(() => {
    const unread = alerts.filter((alert) => !alert.acknowledged_at);
    const criticalOpen = unread.filter(
      (alert) => alert.level === "CRITICAL" && nowMs - new Date(alert.last_seen_at).getTime() < CRITICAL_CARD_WINDOW_MS,
    );
    return { alerts, unread, criticalOpen, error, loaded, acknowledge, acknowledgeAll };
  }, [alerts, nowMs, error, loaded, acknowledge, acknowledgeAll]);

  return <WearableAlertsContext.Provider value={value}>{children}</WearableAlertsContext.Provider>;
}

export function useWearableAlerts() {
  const value = useContext(WearableAlertsContext);
  if (!value) throw new Error("useWearableAlerts must be used inside WearableAlertsProvider");
  return value;
}

const VN_OFFSET_MS = 7 * 3600 * 1000;

/** "08:15" nếu hôm nay (giờ Việt Nam), "08:15 · 22/10" nếu ngày khác. */
export function alertTime(iso: string, nowMs = Date.now()) {
  const at = new Date(new Date(iso).getTime() + VN_OFFSET_MS);
  const today = new Date(nowMs + VN_OFFSET_MS);
  const hhmm = `${String(at.getUTCHours()).padStart(2, "0")}:${String(at.getUTCMinutes()).padStart(2, "0")}`;
  const sameDay = at.getUTCFullYear() === today.getUTCFullYear() && at.getUTCMonth() === today.getUTCMonth() && at.getUTCDate() === today.getUTCDate();
  return sameDay ? hhmm : `${hhmm} · ${String(at.getUTCDate()).padStart(2, "0")}/${String(at.getUTCMonth() + 1).padStart(2, "0")}`;
}
