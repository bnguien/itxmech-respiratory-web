"use client";

import { Activity, Radio, Watch, Wifi, WifiOff } from "lucide-react";
import { useNowSeconds } from "@/lib/wearable/use-now";
import {
  isReadingFresh,
  pickCurrentReading,
  wearableConnection,
  type CurrentReading,
  type WearableConnection,
} from "@/lib/wearable/presentation";
import type { PatientWearableData } from "@/lib/wearable/server";
import type { WearableStatus } from "@/types/wearable";

/** Nhịp tự cập nhật trạng thái kết nối: bằng chu kỳ số hiển thị của vòng. */
const TICK_MS = 15_000;

/**
 * Số SpO₂ "hiện tại" giống app người nhà: số 15 giây hoặc bản ghi phút, cái nào đo sau hơn, kèm trạng thái kết nối.
 * fresh = false khi gián đoạn / mất kết nối: không hiển thị như số hiện tại. null ở lần render đầu.
 */
export function useCurrentReading(
  data: PatientWearableData | null,
): { reading: CurrentReading | null; connection: WearableConnection; fresh: boolean } | null {
  const now = useNowSeconds(TICK_MS);
  if (!data || now === null) return null;
  const connection = wearableConnection(data.device, now, data.config.upload_interval_min);
  const reading = pickCurrentReading(data.live, data.samples.at(-1) ?? null);
  return { reading, connection, fresh: !!reading && isReadingFresh(connection.kind) };
}

const toneStyles: Record<WearableConnection["tone"], string> = {
  ok: "border-green-200 bg-green-50 text-green-800",
  info: "border-sky-200 bg-sky-50 text-sky-900",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  bad: "border-red-200 bg-red-50 text-red-800",
  muted: "border-[#DDE8F4] bg-[#F8FBFE] text-[#5A7799]",
};

const icons = {
  none: Watch,
  waiting_first: Radio,
  live: Activity,
  not_worn: Watch,
  wifi: Wifi,
  interrupted: Radio,
  lost: WifiOff,
} satisfies Record<WearableConnection["kind"], unknown>;

/** Dòng trạng thái kết nối vòng (đang nhận / WiFi dự phòng / gián đoạn / mất kết nối), tự cập nhật theo thời gian. */
export function WearableConnectionBanner({
  device,
  uploadIntervalMin,
  loading = false,
  compact = false,
}: {
  device: WearableStatus | null;
  uploadIntervalMin?: number;
  loading?: boolean;
  compact?: boolean;
}) {
  const now = useNowSeconds(TICK_MS);
  if (loading || now === null) return null;
  const state = wearableConnection(device, now, uploadIntervalMin);
  const Icon = icons[state.kind];
  return (
    <div
      role={state.tone === "bad" || state.tone === "warn" ? "status" : undefined}
      className={`flex items-start gap-3 rounded-2xl border ${compact ? "px-3 py-2" : "px-4 py-3"} ${toneStyles[state.tone]}`}
    >
      <Icon size={compact ? 16 : 18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className={`font-bold ${compact ? "text-xs" : "text-sm"}`}>{state.title}</p>
        {!compact && <p className="mt-0.5 text-xs leading-relaxed">{state.detail}</p>}
      </div>
    </div>
  );
}
