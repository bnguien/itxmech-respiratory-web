"use client";

import { forwardRef } from "react";
import type { RespiratoryCycle } from "@/types/clinical";
import {
  AudioWaveform,
  WaveformLegend,
  type AudioWaveformHandle,
} from "./audio-waveform";

export interface LungSoundWaveformCardProps {
  title?: string;
  audioUrl?: string;
  cycles: RespiratoryCycle[];
  duration: number;
  compact?: boolean;
  showCardWrapper?: boolean;
  showLegend?: boolean;
  className?: string;
  onCyclePlaybackChange?: (cycleId: string | null) => void;
}

export const LungSoundWaveformCard = forwardRef<
  AudioWaveformHandle,
  LungSoundWaveformCardProps
>(function LungSoundWaveformCard(
  {
    title = "Dạng sóng âm phổi & Phân đoạn chu kỳ hô hấp",
    audioUrl = "/audio/REC-001.wav",
    cycles,
    duration,
    compact = false,
    showCardWrapper = true,
    showLegend = true,
    className = "",
    onCyclePlaybackChange,
  },
  ref,
) {
  const content = (
    <div className={showCardWrapper ? "" : className}>
      {(title || showLegend) && (
        <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          {title && (
            <h2 className="text-base font-extrabold text-[#173A5E] sm:text-lg">
              {title}
            </h2>
          )}
          {showLegend && <WaveformLegend />}
        </div>
      )}
      <AudioWaveform
        ref={ref}
        audioUrl={audioUrl}
        cycles={cycles}
        duration={duration}
        compact={compact}
        onCyclePlaybackChange={onCyclePlaybackChange}
      />
    </div>
  );

  if (!showCardWrapper) {
    return content;
  }

  return (
    <section className={`card p-6 sm:p-8 ${className}`}>
      {content}
    </section>
  );
});
