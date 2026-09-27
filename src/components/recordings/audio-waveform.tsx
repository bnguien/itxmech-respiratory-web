"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pause, Play, Volume2 } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import type { LungSound, RespiratoryCycle } from "@/types/clinical";

const cycleStyle: Record<
  LungSound,
  { region: string; solid: string; text: string }
> = {
  Normal: {
    region: "rgba(34, 197, 94, .13)",
    solid: "#22A95A",
    text: "text-emerald-700",
  },
  Crackles: {
    region: "rgba(245, 158, 11, .14)",
    solid: "#E89512",
    text: "text-amber-700",
  },
  Wheezes: {
    region: "rgba(99, 102, 241, .13)",
    solid: "#6366F1",
    text: "text-indigo-700",
  },
  "Crackles + Wheezes": {
    region: "rgba(239, 68, 68, .12)",
    solid: "#E84C4C",
    text: "text-red-600",
  },
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00.0";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds - minutes * 60;
  return `${String(minutes).padStart(2, "0")}:${remaining.toFixed(1).padStart(4, "0")}`;
}

export interface AudioWaveformHandle {
  playCycle: (cycle: RespiratoryCycle) => void;
  pause: () => void;
}

interface AudioWaveformProps {
  audioUrl?: string;
  cycles: RespiratoryCycle[];
  duration: number;
  compact?: boolean;
  onCyclePlaybackChange?: (cycleId: string | null) => void;
}

export const AudioWaveform = forwardRef<
  AudioWaveformHandle,
  AudioWaveformProps
>(function AudioWaveform(
  {
    audioUrl = "/audio/REC-001.wav",
    cycles,
    duration: expectedDuration,
    compact = false,
    onCyclePlaybackChange,
  },
  ref,
) {
  const waveformRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const regionsRef = useRef<ReturnType<typeof RegionsPlugin.create> | null>(null);
  const cyclesRef = useRef(cycles);
  cyclesRef.current = cycles;
  const activeSegmentEndRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(expectedDuration);
  const [activeCycleId, setActiveCycleId] = useState<string | null>(null);

  useEffect(() => {
    if (!waveformRef.current || !timelineRef.current) return;
    const regions = RegionsPlugin.create();
    regionsRef.current = regions;
    const timeline = TimelinePlugin.create({
      container: timelineRef.current,
      height: compact ? 16 : 24,
      timeInterval: compact ? 5 : 2,
      primaryLabelInterval: compact ? 10 : 5,
      style: { fontSize: compact ? "9px" : "10px", color: "#7894B3" },
    });
    const waveSurfer = WaveSurfer.create({
      container: waveformRef.current,
      url: audioUrl,
      height: compact ? 64 : 180,
      waveColor: "#8BA9C8",
      progressColor: "#2F78C8",
      cursorColor: "#173A5E",
      cursorWidth: 1,
      barWidth: compact ? 1 : 2,
      barGap: compact ? 1 : 2,
      barRadius: 2,
      normalize: true,
      interact: true,
      plugins: [regions, timeline],
    });
    waveSurferRef.current = waveSurfer;

    waveSurfer.on("ready", () => {
      setReady(true);
      setDuration(waveSurfer.getDuration());
      cyclesRef.current.forEach((cycle) =>
        regions.addRegion({
          id: cycle.id,
          start: cycle.start,
          end: cycle.end,
          color: cycleStyle[cycle.classification].region,
          drag: false,
          resize: false,
        }),
      );
    });
    waveSurfer.on("play", () => setPlaying(true));
    waveSurfer.on("pause", () => setPlaying(false));
    waveSurfer.on("finish", () => {
      setPlaying(false);
      setActiveCycleId(null);
      onCyclePlaybackChange?.(null);
      activeSegmentEndRef.current = null;
    });
    waveSurfer.on("timeupdate", (time) => {
      setCurrentTime(time);
      if (
        activeSegmentEndRef.current !== null &&
        time >= activeSegmentEndRef.current
      ) {
        waveSurfer.pause();
        setActiveCycleId(null);
        onCyclePlaybackChange?.(null);
        activeSegmentEndRef.current = null;
      }
    });
    regions.on("region-clicked", (region, event) => {
      event.stopPropagation();
      const cycle = cyclesRef.current.find((item) => item.id === region.id);
      if (!cycle) return;
      setActiveCycleId(cycle.id);
      onCyclePlaybackChange?.(cycle.id);
      activeSegmentEndRef.current = cycle.end;
      waveSurfer.setTime(cycle.start);
      void waveSurfer.play();
    });

    return () => {
      regionsRef.current = null;
      waveSurfer.destroy();
      waveSurferRef.current = null;
    };
  }, [audioUrl, compact, onCyclePlaybackChange]);

  useEffect(() => {
    if (!ready || !regionsRef.current) return;
    const currentRegions = regionsRef.current.getRegions();
    cycles.forEach((cycle) => {
      const reg = currentRegions.find((r) => r.id === cycle.id);
      if (reg && reg.element) {
        reg.element.style.backgroundColor = cycleStyle[cycle.classification].region;
      }
    });
  }, [cycles, ready]);

  const togglePlayback = () => {
    activeSegmentEndRef.current = null;
    setActiveCycleId(null);
    onCyclePlaybackChange?.(null);
    void waveSurferRef.current?.playPause();
  };
  const playCycle = useCallback(
    (cycle: RespiratoryCycle) => {
      if (!ready || !waveSurferRef.current) return;
      setActiveCycleId(cycle.id);
      onCyclePlaybackChange?.(cycle.id);
      activeSegmentEndRef.current = cycle.end;
      waveSurferRef.current.setTime(cycle.start);
      void waveSurferRef.current.play();
    },
    [onCyclePlaybackChange, ready],
  );

  const pause = useCallback(() => {
    waveSurferRef.current?.pause();
    activeSegmentEndRef.current = null;
    setActiveCycleId(null);
    onCyclePlaybackChange?.(null);
  }, [onCyclePlaybackChange]);

  const seekTo = (time: number) => {
    if (!waveSurferRef.current) return;
    activeSegmentEndRef.current = null;
    setActiveCycleId(null);
    onCyclePlaybackChange?.(null);
    waveSurferRef.current.setTime(time);
    setCurrentTime(time);
  };

  useImperativeHandle(ref, () => ({ pause, playCycle }), [pause, playCycle]);

  return (
    <div className={compact ? "space-y-2" : "space-y-4"}>
      <div className="overflow-hidden rounded-2xl border border-[#DDEAF8] bg-white px-3 pt-3">
        <div ref={waveformRef} />
        <div ref={timelineRef} />
      </div>
      <div
        className={`grid ${compact ? "grid-cols-4 gap-1.5" : "grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3"}`}
      >
        {cycles.map((cycle) => (
          <button
            key={cycle.id}
            type="button"
            onClick={() => playCycle(cycle)}
            disabled={!ready}
            className={`min-w-0 rounded-xl border ${compact ? "px-2 py-1.5" : "px-3 py-2.5"} text-left transition-colors ${
              activeCycleId === cycle.id
                ? "border-[#2F78C8] bg-[#F2F7FD] shadow-sm"
                : "border-[#E1ECF7] bg-white hover:border-[#CCE2F7] hover:bg-[#F9FCFF]"
            }`}
          >
            <span
              className={`block truncate ${compact ? "text-[10px]" : "text-xs"} font-bold ${cycleStyle[cycle.classification].text}`}
            >
              {compact
                ? `C${cycle.number}`
                : `Cycle ${String(cycle.number).padStart(2, "0")} · ${cycle.classification}`}
            </span>
            <span
              className={`block ${compact ? "text-[9px]" : "text-[11px] mt-0.5"} text-[#7894B3]`}
            >
              {cycle.confidence}% · {cycle.start.toFixed(1)}–
              {cycle.end.toFixed(1)}s
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={!ready}
          className={`${compact ? "h-9 w-9" : "h-12 w-12"} flex shrink-0 items-center justify-center rounded-full bg-[#2F78C8] text-white disabled:opacity-40`}
        >
          {playing ? (
            <Pause size={compact ? 15 : 19} fill="currentColor" />
          ) : (
            <Play
              size={compact ? 15 : 19}
              fill="currentColor"
              className="ml-0.5"
            />
          )}
        </button>
        <span className="shrink-0 font-mono text-[11px] font-semibold text-[#173A5E]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <input
          aria-label="Tua bản ghi"
          type="range"
          min="0"
          max={duration || expectedDuration}
          step="0.05"
          value={Math.min(currentTime, duration || expectedDuration)}
          onChange={(event) => seekTo(Number(event.target.value))}
          disabled={!ready}
          className="min-w-16 flex-1 cursor-pointer accent-[#2F78C8] disabled:opacity-40"
        />
        {!compact && (
          <>
            <Volume2 size={17} className="shrink-0 text-[#5A7799]" />
            <input
              aria-label="Âm lượng"
              type="range"
              min="0"
              max="1"
              step="0.01"
              defaultValue="1"
              onChange={(event) =>
                waveSurferRef.current?.setVolume(Number(event.target.value))
              }
              className="w-24 accent-[#2F78C8]"
            />
          </>
        )}
      </div>
    </div>
  );
});

export function WaveformLegend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      {Object.entries(cycleStyle).map(([label, style]) => (
        <span key={label} className="flex items-center gap-1.5 text-[#5A7799]">
          <i
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: style.solid }}
          />
          {label === "Crackles + Wheezes" ? "Both" : label}
        </span>
      ))}
    </div>
  );
}
