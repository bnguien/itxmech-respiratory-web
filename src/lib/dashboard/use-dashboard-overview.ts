"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DashboardOverview } from "@/lib/dashboard/overview";

const REFETCH_DEBOUNCE_MS = 3000;

/** Tổng quan dashboard; tải lại khi có bản ghi phút / assessment mới ở bất kỳ bệnh nhân nào (Supabase Realtime). */
export function useDashboardOverview() {
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState("");
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard/overview", { cache: "no-store" });
      const payload = (await response.json()) as { data?: DashboardOverview; error?: { message?: string } };
      if (!response.ok || !payload.data) throw new Error(payload.error?.message || "Không thể tải tổng quan.");
      setData(payload.data);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể tải tổng quan.");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const supabase = createClient();
    let active = true;
    const invalidate = () => {
      if (!active) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void load(), REFETCH_DEBOUNCE_MS);
    };
    const channel = supabase
      .channel(`dashboard:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "vitals_minute" }, invalidate)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "assessments" }, invalidate)
      .subscribe();
    return () => {
      active = false;
      if (timer.current) window.clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  return { data, error };
}
