"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { LoaderCircle, Pause, Play, Volume2 } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { ApiError } from "@/types/visit";
import type { PlaybackUrlResponse } from "@/types/recording";
import type { AnalyzedCycle } from "@/types/analysis";
import { effectiveCycleLabel } from "@/lib/recordings/presentation";
import { cycleWaveformRenderer, preserveCycleProgressColors, styleCycleRegion } from "@/lib/recordings/waveform-presentation";
import { LungSoundLegend } from "@/components/ui/status-badge";
import { cacheWaveform, evictCachedWaveform, getCachedWaveform } from "@/lib/recordings/waveform-cache";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export interface RecordingWaveformHandle {
  selectCycle: (cycle: AnalyzedCycle) => void;
  playCycle: (cycle: AnalyzedCycle) => void;
  pause: () => void;
}

interface Props {
  recordingId: string;
  cycles?: AnalyzedCycle[];
  selectedCycleId?: string | null;
  onSelectCycle?: (id: string) => void;
  onCyclePlaybackChange?: (id: string | null) => void;
  onDurationChange?: (seconds: number) => void;
  onReadyChange?: (ready: boolean) => void;
}

export const RecordingWaveform = forwardRef<RecordingWaveformHandle, Props>(function RecordingWaveform(props, ref) {
  return <WaveformPlayer key={props.recordingId} {...props} ref={ref} />;
});

const WaveformPlayer = forwardRef<RecordingWaveformHandle, Props>(function WaveformPlayer({ recordingId, cycles, selectedCycleId, ...callbacks }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
  const segmentEnd = useRef<number | null>(null);
  const current = useRef({ cycles, selectedCycleId, ...callbacks });
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loadProgress, setLoadProgress] = useState(0);
  const expanded = cycles !== undefined;

  useEffect(() => { current.current = { cycles, selectedCycleId, ...callbacks }; });

  const clearSegment = useCallback(() => {
    segmentEnd.current = null;
    current.current.onCyclePlaybackChange?.(null);
  }, []);

  const selectCycle = useCallback((cycle: AnalyzedCycle) => {
    current.current.onSelectCycle?.(cycle.id);
    const wave = waveRef.current;
    if (!wave) return;
    clearSegment();
    wave.pause();
    wave.setTime(cycle.start_seconds);
  }, [clearSegment]);

  const playCycle = useCallback((cycle: AnalyzedCycle) => {
    if (!ready || !waveRef.current) return;
    selectCycle(cycle);
    segmentEnd.current = cycle.end_seconds;
    current.current.onCyclePlaybackChange?.(cycle.id);
    void waveRef.current.play().catch(() => setError("Không thể phát âm thanh. Vui lòng thử lại."));
  }, [ready, selectCycle]);

  const pause = useCallback(() => {
    waveRef.current?.pause();
    clearSegment();
  }, [clearSegment]);

  useImperativeHandle(ref, () => ({ selectCycle, playCycle, pause }), [selectCycle, playCycle, pause]);

  useEffect(() => {
    if (!containerRef.current) return;
    const controller = new AbortController();
    let wave: WaveSurfer | null = null;
    async function load() {
      try {
        const response = await fetch(`/api/recordings/${recordingId}/playback-url`, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as PlaybackUrlResponse | ApiError;
        if (controller.signal.aborted) return;
        if (!response.ok || !("data" in payload)) {
          setError((payload as ApiError).error?.message || "Không thể tải bản ghi âm.");
          return;
        }
        if (!containerRef.current) return;
        const regions = RegionsPlugin.create();
        regionsRef.current = regions;
        const cached = getCachedWaveform(recordingId);
        wave = WaveSurfer.create({
          container: containerRef.current, url: payload.data.url,
          ...(cached ?? {}),
          fetchParams: { signal: controller.signal },
          height: expanded ? 180 : 90,
          waveColor: "#9BB7D3", progressColor: "#9BB7D3", cursorColor: "#173A5E",
          renderFunction: cycleWaveformRenderer(() => ({
            segments: (current.current.cycles ?? []).map((c) => ({ start: c.start_seconds, end: c.end_seconds, label: effectiveCycleLabel(c) })),
            duration: waveRef.current?.getDuration() ?? 0,
            width: waveRef.current?.getWrapper().clientWidth ?? 0,
          })),
          barWidth: 2, barGap: 2, barRadius: 2, normalize: true, plugins: [regions],
        });
        waveRef.current = wave;
        wave.on("loading", (percent) => setLoadProgress(Math.round(percent)));
        wave.on("redrawcomplete", () => {
          if (wave) preserveCycleProgressColors(wave.getWrapper());
        });
        wave.on("ready", () => {
          setReady(true);
          const length = wave?.getDuration() ?? 0;
          if (!cached && wave) cacheWaveform(recordingId, wave.exportPeaks({ channels: 2, maxLength: 4096, precision: 10000 }), length);
          setDuration(length);
          current.current.onDurationChange?.(length);
          current.current.onReadyChange?.(true);
          const selected = current.current.cycles?.find((c) => c.id === current.current.selectedCycleId);
          if (selected) wave?.setTime(selected.start_seconds);
        });
        wave.on("play", () => setPlaying(true));
        wave.on("pause", () => { setPlaying(false); current.current.onCyclePlaybackChange?.(null); });
        wave.on("finish", () => { setPlaying(false); clearSegment(); });
        wave.on("timeupdate", (time) => {
          setCurrentTime(time);
          if (segmentEnd.current !== null && time >= segmentEnd.current) {
            const end = segmentEnd.current;
            clearSegment();
            wave?.pause();
            wave?.setTime(end);
          }
        });
        wave.on("interaction", (time) => {
          clearSegment();
          const cycle = current.current.cycles?.find((c) => time >= c.start_seconds && time < c.end_seconds);
          if (cycle) current.current.onSelectCycle?.(cycle.id);
        });
        wave.on("error", () => {
          if (controller.signal.aborted) return;
          evictCachedWaveform(recordingId);
          setError("Không thể giải mã hoặc tải file WAV. Vui lòng tải lại âm thanh.");
          setReady(false);
          current.current.onReadyChange?.(false);
        });
        regions.on("region-clicked", (region, event) => {
          event.stopPropagation();
          const cycle = current.current.cycles?.find((c) => c.id === region.id);
          if (cycle) selectCycle(cycle);
        });
      } catch {
        if (!controller.signal.aborted) setError("Không thể tải bản ghi âm.");
      }
    }
    void load();
    return () => {
      controller.abort();
      wave?.destroy();
      waveRef.current = null;
      regionsRef.current = null;
    };
  }, [recordingId, attempt, expanded, clearSegment, selectCycle]);

  useEffect(() => {
    if (ready) waveRef.current?.setOptions({}); // Repaint changed labels without reloading audio.
  }, [cycles, ready]);

  useEffect(() => {
    if (!ready || !regionsRef.current) return;
    const regions = regionsRef.current;
    const existing = regions.getRegions();
    existing.forEach((region) => { if (!cycles?.some((c) => c.id === region.id)) region.remove(); });
    cycles?.forEach((cycle) => {
      const selected = cycle.id === selectedCycleId;
      const label = effectiveCycleLabel(cycle);
      const options = {
        id: cycle.id, start: cycle.start_seconds, end: cycle.end_seconds,
        color: "transparent",
        drag: false, resize: false,
      };
      const region = existing.find((r) => r.id === cycle.id) ?? regions.addRegion(options);
      region.setOptions(options);
      if (!region.element) return;
      styleCycleRegion(region, cycle.cycle_index + 1, label, selected);
      region.element.setAttribute("role", "button");
      region.element.setAttribute("tabindex", "0");
      region.element.setAttribute("aria-label", `Chọn vùng chu kỳ ${cycle.cycle_index + 1}`);
      region.element.setAttribute("aria-pressed", String(selected));
      region.element.onkeydown = (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectCycle(cycle); }
      };
    });
  }, [cycles, ready, selectedCycleId, selectCycle]);

  const seek = (position: number) => {
    clearSegment();
    waveRef.current?.setTime(position);
    setCurrentTime(position);
    const cycle = cycles?.find((c) => position >= c.start_seconds && position < c.end_seconds);
    if (cycle) callbacks.onSelectCycle?.(cycle.id);
  };

  return (
    <div className="space-y-4">
      {expanded && <LungSoundLegend />}
      <div ref={containerRef} aria-label="Dạng sóng âm phổi" className={`${expanded ? "min-h-[196px]" : "min-h-[106px]"} overflow-hidden rounded-2xl border border-[#DDEAF8] bg-white px-3 py-2`} />
      {error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={() => {
            evictCachedWaveform(recordingId); setLoadProgress(0);
            clearSegment(); setError(""); setReady(false); setPlaying(false); setCurrentTime(0); setVolume(1);
            callbacks.onReadyChange?.(false); setAttempt((n) => n + 1);
          }}>Tải lại âm thanh</button>
        </div>
      ) : !ready ? <p role="status" className="text-xs text-[#5A7799]">{loadProgress >= 100 ? "Đang xử lý dạng sóng…" : loadProgress > 0 ? `Đang tải âm thanh… ${loadProgress}%` : "Đang tải âm thanh…"}</p> : expanded ? <p className="text-xs text-[#5A7799]">Chọn vùng trên dạng sóng hoặc chu kỳ để nghe và đánh giá.</p> : null}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <button type="button" disabled={!ready || !!error} onClick={() => {
          clearSegment();
          void waveRef.current?.playPause().catch(() => setError("Không thể phát âm thanh. Vui lòng thử lại."));
        }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2F78C8] text-white transition-colors hover:bg-[#2563A6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F78C8] disabled:cursor-not-allowed disabled:opacity-40" aria-label={playing ? "Tạm dừng" : "Phát bản ghi"}>
          {!ready ? <LoaderCircle size={18} className="animate-spin" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
        </button>
        <span className="font-mono text-xs font-semibold text-[#173A5E]" aria-live="off">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <input aria-label="Tua đến vị trí muốn nghe" type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} disabled={!ready || !!error || duration <= 0} onChange={(event) => seek(Number(event.target.value))} className="min-w-24 flex-1 cursor-pointer accent-[#2F78C8] disabled:opacity-40" />
        {expanded && <div className="flex items-center gap-2">
          <Volume2 size={17} aria-hidden="true" className="text-[#5A7799]" />
          <input aria-label="Âm lượng" type="range" min="0" max="1" step="0.01" value={volume} disabled={!ready || !!error} onChange={(event) => { const value = Number(event.target.value); setVolume(value); waveRef.current?.setVolume(value); }} className="w-20 accent-[#2F78C8]" />
        </div>}
      </div>
    </div>
  );
});
