import type { WaveSurferOptions } from "wavesurfer.js";
import type { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import type { CycleLabel } from "@/types/analysis";
import { cycleLabelStyles } from "./presentation";

interface WaveformSegment {
  start: number;
  end: number;
  label: CycleLabel | null;
}

/** Color the decoded audio bars themselves, leaving all space around them white. */
export function cycleWaveformRenderer(getState: () => {
  segments: WaveformSegment[];
  duration: number;
  width: number;
  compact?: boolean;
}): NonNullable<WaveSurferOptions["renderFunction"]> {
  return (channels, ctx) => {
    const state = getState();
    const samples = channels[0];
    if (!samples?.length || !ctx.canvas.width || !ctx.canvas.height) return;
    const cssWidth = parseFloat(ctx.canvas.style.width) || ctx.canvas.width;
    const ratio = ctx.canvas.width / cssWidth;
    // WaveSurfer splits wide/high-DPI waveforms into canvases. Use the absolute
    // chunk offset so a later canvas doesn't repeat the first cycle's colors.
    const offset = parseFloat(ctx.canvas.style.left) || 0;
    const totalWidth = state.width || cssWidth;
    const top = 8 * ratio;
    const bottom = 10 * ratio;
    const halfHeight = Math.max(1, (ctx.canvas.height - top - bottom) / 2);
    const center = top + halfHeight;
    const step = (state.compact ? 2 : 4) * ratio;
    const barWidth = (state.compact ? 1 : 2) * ratio;
    let max = 0;
    for (const sample of samples) max = Math.max(max, Math.abs(sample));
    const scale = max > 0 ? halfHeight / max : 0;

    for (let x = 0; x < ctx.canvas.width; x += step) {
      const start = Math.floor(x / ctx.canvas.width * samples.length);
      const end = Math.min(samples.length, Math.max(start + 1, Math.floor((x + step) / ctx.canvas.width * samples.length)));
      let peak = 0;
      for (let i = start; i < end; i++) peak = Math.max(peak, Math.abs(samples[i]));
      const time = (offset + x / ratio) / totalWidth * state.duration;
      const segment = state.segments.find((item) => time >= item.start && time < item.end);
      ctx.fillStyle = segment?.label ? cycleLabelStyles[segment.label].solid : "#9BB7D3";
      const height = Math.max(ratio, peak * scale * 2);
      ctx.beginPath();
      ctx.roundRect(x, center - height / 2, barWidth, height, barWidth / 2);
      ctx.fill();
    }
  };
}

// WaveSurfer masks already-played audio with a second canvas. Keep that canvas
// identical to the classified waveform, so playback never recolors/hides labels.
export function preserveCycleProgressColors(wrapper: HTMLElement) {
  const originals = wrapper.querySelectorAll<HTMLCanvasElement>('[part="canvases"] canvas');
  const progress = wrapper.querySelectorAll<HTMLCanvasElement>('[part="progress"] canvas');
  progress.forEach((canvas, index) => {
    const original = originals[index];
    const context = canvas.getContext("2d");
    if (!original || !context) return;
    context.globalCompositeOperation = "source-over";
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(original, 0, 0);
  });
}

/** Transparent hit area and thin underline; cycle details live below the player. */
export function styleCycleRegion(region: Region, number: number, label: CycleLabel | null, selected: boolean) {
  const element = region.element;
  if (!element) return;
  const style = label ? cycleLabelStyles[label] : null;
  region.setOptions({ color: "transparent", drag: false, resize: false });
  Object.assign(element.style, {
    backgroundColor: "transparent", border: "none", boxShadow: "none",
    borderBottom: `${selected ? 5 : 3}px solid ${style?.solid ?? "#9BB7D3"}`,
    boxSizing: "border-box",
  });
  element.title = `Chu kỳ ${number} · ${style?.name ?? "Chưa phân loại"}`;
}
