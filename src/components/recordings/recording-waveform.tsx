"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Pause, Play } from "lucide-react";
import WaveSurfer from "wavesurfer.js";
import type { ApiError } from "@/types/visit";
import type { PlaybackUrlResponse } from "@/types/recording";

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "00:00";
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

export function RecordingWaveform({ recordingId }: { recordingId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<WaveSurfer | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!containerRef.current) return;
    const controller = new AbortController();
    let wave: WaveSurfer | null = null;
    async function load() {
      try {
        const response = await fetch(
          `/api/recordings/${recordingId}/playback-url`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as
          | PlaybackUrlResponse
          | ApiError;
        if (!response.ok || !("data" in payload)) {
          setError(
            (payload as ApiError).error?.message || "Không thể tải bản ghi âm.",
          );
          return;
        }
        if (!containerRef.current || controller.signal.aborted) return;
        wave = WaveSurfer.create({
          container: containerRef.current,
          url: payload.data.url,
          height: 90,
          waveColor: "#9BB7D3",
          progressColor: "#2F78C8",
          cursorColor: "#173A5E",
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          normalize: true,
        });
        waveRef.current = wave;
        wave.on("ready", () => {
          setReady(true);
          setDuration(wave?.getDuration() ?? 0);
        });
        wave.on("play", () => setPlaying(true));
        wave.on("pause", () => setPlaying(false));
        wave.on("finish", () => setPlaying(false));
        wave.on("timeupdate", setCurrentTime);
        wave.on("error", () => setError("Không thể giải mã file WAV."));
      } catch (loadError) {
        if ((loadError as { name?: string }).name !== "AbortError")
          setError("Không thể tải bản ghi âm.");
      }
    }
    void load();
    return () => {
      controller.abort();
      wave?.destroy();
      waveRef.current = null;
    };
  }, [recordingId]);

  if (error)
    return (
      <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">{error}</p>
    );
  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="min-h-[90px] overflow-hidden rounded-2xl border border-[#DDEAF8] bg-white px-3 py-2"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={!ready}
          onClick={() => void waveRef.current?.playPause()}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2F78C8] text-white disabled:opacity-40"
          aria-label={playing ? "Tạm dừng" : "Phát bản ghi"}
        >
          {!ready ? (
            <LoaderCircle size={17} className="animate-spin" />
          ) : playing ? (
            <Pause size={17} fill="currentColor" />
          ) : (
            <Play size={17} fill="currentColor" />
          )}
        </button>
        <span className="font-mono text-xs font-semibold text-[#173A5E]">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
      <input
        aria-label="Tua đến vị trí muốn nghe"
        type="range"
        min="0"
        max={duration || 0}
        step="0.01"
        value={Math.min(currentTime, duration || 0)}
        disabled={!ready || duration <= 0}
        onChange={(event) => {
          const position = Number(event.target.value);
          waveRef.current?.setTime(position);
          setCurrentTime(position);
        }}
        className="h-2 w-full cursor-pointer accent-[#2F78C8] disabled:cursor-not-allowed disabled:opacity-40"
      />
    </div>
  );
}
