import "server-only";

import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { recordings } from "@/lib/db/schema/recordings";
import type { Recording, RecordingUploadStatus } from "@/types/recording";

export const MAX_WAV_BYTES = 50 * 1024 * 1024;
export const SIGNED_URL_EXPIRY_SECONDS = 600;

export const recordingSelection = {
  id: recordings.id,
  visitId: recordings.visitId,
  uploadStatus: recordings.uploadStatus,
  fileSizeBytes: recordings.fileSizeBytes,
  durationMs: recordings.durationMs,
  sampleRateHz: recordings.sampleRateHz,
  bitDepth: recordings.bitDepth,
  channelCount: recordings.channelCount,
  uploadedAt: recordings.uploadedAt,
};

export function serializeRecording(row: {
  id: string;
  visitId: string;
  uploadStatus: string;
  fileSizeBytes: number | null;
  durationMs: number | null;
  sampleRateHz: number | null;
  bitDepth: number | null;
  channelCount: number | null;
  uploadedAt: string | null;
}): Recording {
  return {
    id: row.id,
    visit_id: row.visitId,
    upload_status: row.uploadStatus as RecordingUploadStatus,
    file_size_bytes: row.fileSizeBytes,
    duration_ms: row.durationMs,
    sample_rate_hz: row.sampleRateHz,
    bit_depth: row.bitDepth,
    channel_count: row.channelCount,
    uploaded_at: row.uploadedAt,
  };
}

export function recordingError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function internalRecordingError(action: string, error: unknown) {
  const code =
    typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "UNKNOWN";
  console.error(`[Recording API] ${action}`, { code });
  return recordingError(500, "INTERNAL_ERROR", "Không thể xử lý bản ghi âm. Vui lòng thử lại.");
}

export function authorizeDevice(request: NextRequest) {
  const supplied = request.headers.get("x-device-key");
  const expected = process.env.FIRMWARE_DEVICE_API_KEY;
  if (!supplied || !expected) {
    return recordingError(401, "UNAUTHORIZED", "Thiết bị chưa được xác thực.");
  }
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return recordingError(401, "UNAUTHORIZED", "Thiết bị chưa được xác thực.");
  }
  return null;
}

export interface VerifiedWavMetadata {
  fileSizeBytes: number;
  durationMs: number;
  sampleRateHz: number;
  bitDepth: number;
  channelCount: number;
}

export function parseAndValidateWav(bytes: ArrayBuffer): VerifiedWavMetadata | null {
  const view = new DataView(bytes);
  if (view.byteLength < 44 || ascii(view, 0, 4) !== "RIFF" || ascii(view, 8, 4) !== "WAVE") {
    return null;
  }

  let offset = 12;
  let format: { audioFormat: number; channels: number; sampleRate: number; byteRate: number; bitDepth: number } | null = null;
  let dataSize: number | null = null;
  while (offset + 8 <= view.byteLength) {
    const chunkId = ascii(view, offset, 4);
    const chunkSize = view.getUint32(offset + 4, true);
    const bodyOffset = offset + 8;
    if (bodyOffset + chunkSize > view.byteLength) return null;
    if (chunkId === "fmt " && chunkSize >= 16) {
      format = {
        audioFormat: view.getUint16(bodyOffset, true),
        channels: view.getUint16(bodyOffset + 2, true),
        sampleRate: view.getUint32(bodyOffset + 4, true),
        byteRate: view.getUint32(bodyOffset + 8, true),
        bitDepth: view.getUint16(bodyOffset + 14, true),
      };
    } else if (chunkId === "data") {
      dataSize = chunkSize;
    }
    offset = bodyOffset + chunkSize + (chunkSize % 2);
  }
  if (
    !format ||
    dataSize === null ||
    format.audioFormat !== 1 ||
    format.channels !== 1 ||
    format.sampleRate !== 16000 ||
    format.bitDepth !== 16 ||
    format.byteRate <= 0
  ) return null;

  return {
    fileSizeBytes: view.byteLength,
    durationMs: Math.round((dataSize / format.byteRate) * 1000),
    sampleRateHz: format.sampleRate,
    bitDepth: format.bitDepth,
    channelCount: format.channels,
  };
}

function ascii(view: DataView, offset: number, length: number) {
  let result = "";
  for (let index = 0; index < length; index += 1) {
    result += String.fromCharCode(view.getUint8(offset + index));
  }
  return result;
}
