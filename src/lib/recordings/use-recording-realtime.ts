"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Payloads only invalidate API reads; never use them as application data.
export function useRecordingRealtime(column: "visit_id" | "id", id: string) {
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => {
    const supabase = createClient();
    let active = true;
    const invalidate = () => { if (active) setRevision((value) => value + 1); };
    const channel = supabase.channel(`recordings:${column}:${id}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recordings", filter: `${column}=eq.${id}` }, (payload) => {
        console.log("[Realtime] INSERT recording:", payload);
        invalidate();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "recordings", filter: `${column}=eq.${id}` }, (payload) => {
        console.log("[Realtime] UPDATE recording:", payload);
        invalidate();
      });
    async function subscribe() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;
        console.log("[Realtime] auth user:", session?.user?.id ?? "ANON");
      } catch (error) {
        if (!active) return;
        console.log("[Realtime] auth session error:", error);
      }
      channel.subscribe((status, error) => {
        console.log("[Realtime] subscription status:", status, error);
        if (!active) return;
        if (status === "SUBSCRIBED") {
          setError("");
          // Catch changes between initial fetch and subscription, and reconnects.
          invalidate();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setError("Kết nối cập nhật trực tiếp bị gián đoạn. Vui lòng tải lại kết quả.");
        }
      });
    }
    void subscribe();
    return () => {
      active = false;
      console.log("[Realtime] removing channel");
      void supabase.removeChannel(channel);
    };
  }, [column, id]);
  return { revision, error };
}
