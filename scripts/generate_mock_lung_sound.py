"""Generate a deterministic WAV fixture for WaveSurfer UI development.

The generated signal is synthetic and must never be treated as medical data.
"""

from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 16_000
DURATION_SECONDS = 24.6
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio" / "REC-001.wav"

CYCLES = (
    (0.0, 3.05, "crackles"),
    (3.05, 6.10, "both"),
    (6.10, 9.15, "wheezes"),
    (9.15, 12.20, "normal"),
    (12.20, 15.25, "crackles"),
    (15.25, 18.30, "both"),
    (18.30, 21.35, "normal"),
    (21.35, 24.60, "wheezes"),
)


def cycle_at(time_seconds: float) -> tuple[float, float, str]:
    return next(cycle for cycle in CYCLES if cycle[0] <= time_seconds < cycle[1])


def sample_value(time_seconds: float, rng: random.Random) -> float:
    start, end, label = cycle_at(time_seconds)
    local = time_seconds - start
    phase = local / (end - start)
    breath_envelope = 0.18 + 0.82 * math.sin(math.pi * phase) ** 1.4
    breath = (rng.random() * 2 - 1) * 0.15 * breath_envelope
    low_body = 0.055 * math.sin(2 * math.pi * 105 * time_seconds) * breath_envelope
    signal = breath + low_body

    if label in {"wheezes", "both"}:
        signal += 0.16 * math.sin(2 * math.pi * (420 + 25 * math.sin(2 * math.pi * 0.7 * local)) * time_seconds) * breath_envelope

    if label in {"crackles", "both"}:
        for crackle_time in (0.48, 0.83, 1.27, 1.72, 2.18, 2.61):
            distance = abs(local - crackle_time)
            if distance < 0.012:
                signal += 0.55 * math.exp(-distance * 260) * math.sin(2 * math.pi * 780 * distance)

    fade = min(1.0, time_seconds / 0.08, (DURATION_SECONDS - time_seconds) / 0.08)
    return max(-1.0, min(1.0, signal * max(0.0, fade)))


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    rng = random.Random(20260927)
    frame_count = int(SAMPLE_RATE * DURATION_SECONDS)
    with wave.open(str(OUTPUT), "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(SAMPLE_RATE)
        frames = bytearray()
        for index in range(frame_count):
            value = sample_value(index / SAMPLE_RATE, rng)
            frames.extend(struct.pack("<h", int(value * 32767)))
        wav_file.writeframes(frames)
    print(f"Created {OUTPUT} ({DURATION_SECONDS:.1f}s, mono, {SAMPLE_RATE} Hz)")


if __name__ == "__main__":
    main()
