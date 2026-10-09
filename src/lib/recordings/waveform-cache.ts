// Small, memory-only display cache. Audio access still requires a fresh signed URL.
// These samples are for drawing only; playback always uses the original WAV.
interface CachedWaveform {
  peaks: number[][];
  duration: number;
  expiresAt: number;
}
const entries = new Map<string, CachedWaveform>();
const ttl = 10 * 60 * 1000;
const capacity = 8;

export function getCachedWaveform(id: string) {
  const entry = entries.get(id);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) { entries.delete(id); return undefined; }
  entries.delete(id);
  entries.set(id, entry);
  return { peaks: entry.peaks, duration: entry.duration };
}

export function cacheWaveform(id: string, peaks: number[][], duration: number) {
  if (!Number.isFinite(duration) || duration <= 0 || !peaks.length || peaks.some((channel) => !channel.length)) return;
  entries.delete(id);
  entries.set(id, { peaks, duration, expiresAt: Date.now() + ttl });
  while (entries.size > capacity) entries.delete(entries.keys().next().value!);
}

export function evictCachedWaveform(id: string) { entries.delete(id); }
