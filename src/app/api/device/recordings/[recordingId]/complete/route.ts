import { and, eq, ne } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordings } from "@/lib/db/schema/recordings";
import { analyzeUploadedRecording } from "@/lib/recordings/analysis";
import {
  authorizeDevice,
  internalRecordingError,
  MAX_WAV_BYTES,
  parseAndValidateWav,
  recordingError,
  recordingSelection,
  serializeRecording,
} from "@/lib/recordings/server";
import {
  createSupabaseAdminClient,
  getLungRecordingsBucket,
} from "@/lib/supabase/admin";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ recordingId: string }> };

export const runtime = "nodejs";
export const maxDuration = 180;

function validBody(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const allowed = new Set([
    "file_size_bytes",
    "duration_ms",
    "sample_rate_hz",
    "bit_depth",
    "channel_count",
  ]);
  return Object.entries(value).every(
    ([key, field]) =>
      allowed.has(key) &&
      typeof field === "number" &&
      Number.isSafeInteger(field) &&
      field >= 0,
  );
}

export async function POST(request: NextRequest, { params }: Context) {
  const unauthorized = authorizeDevice(request);
  if (unauthorized) return unauthorized;
  const { recordingId } = await params;
  if (!uuidPattern.test(recordingId))
    return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return recordingError(
      400,
      "VALIDATION_ERROR",
      "Dữ liệu JSON không hợp lệ.",
    );
  }
  if (!validBody(body))
    return recordingError(
      400,
      "VALIDATION_ERROR",
      "Metadata bản ghi không hợp lệ.",
    );

  try {
    const [current] = await db
      .select({ ...recordingSelection, storagePath: recordings.storagePath })
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    if (!current)
      return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");
    if (current.uploadStatus === "uploaded") {
      await analyzeUploadedRecording(recordingId);
      return NextResponse.json({ data: serializeRecording(current) });
    }

    const storage = createSupabaseAdminClient().storage.from(
      getLungRecordingsBucket(),
    );
    const { data: objectInfo, error: infoError } = await storage.info(
      current.storagePath,
    );
    if (infoError || !objectInfo)
      return recordingError(
        404,
        "NOT_FOUND",
        "Không tìm thấy file WAV trong Storage.",
      );
    const objectSize = Number(objectInfo.size);
    if (!Number.isFinite(objectSize) || objectSize <= 0) {
      await markFailed(recordingId, 0);
      return recordingError(
        415,
        "INVALID_AUDIO_FORMAT",
        "File WAV rỗng hoặc không hợp lệ.",
      );
    }
    if (objectSize > MAX_WAV_BYTES) {
      await markFailed(recordingId, objectSize);
      return recordingError(
        413,
        "FILE_TOO_LARGE",
        "File WAV vượt quá giới hạn 50 MB.",
      );
    }

    const { data: blob, error: downloadError } = await storage.download(
      current.storagePath,
    );
    if (downloadError || !blob)
      return recordingError(
        404,
        "NOT_FOUND",
        "Không thể đọc file WAV trong Storage.",
      );
    const verified = parseAndValidateWav(await blob.arrayBuffer());
    if (!verified) {
      await markFailed(recordingId, objectSize);
      return recordingError(
        415,
        "INVALID_AUDIO_FORMAT",
        "Chỉ hỗ trợ WAV PCM mono, 16-bit, 16 kHz.",
      );
    }

    const now = new Date().toISOString();
    const [updated] = await db
      .update(recordings)
      .set({
        uploadStatus: "uploaded",
        mimeType: "audio/wav",
        fileSizeBytes: verified.fileSizeBytes,
        durationMs: verified.durationMs,
        sampleRateHz: verified.sampleRateHz,
        bitDepth: verified.bitDepth,
        channelCount: verified.channelCount,
        uploadedAt: now,
        updatedAt: now,
      })
      .where(and(eq(recordings.id, recordingId), ne(recordings.uploadStatus, "uploaded")))
      .returning(recordingSelection);
    // Another complete request may have validated the same upload first.
    const completed = updated ?? (await db.select(recordingSelection).from(recordings).where(eq(recordings.id, recordingId)))[0];
    await analyzeUploadedRecording(recordingId);
    return NextResponse.json({ data: serializeRecording(completed) });
  } catch (error) {
    return internalRecordingError("Failed to complete recording", error);
  }
}

async function markFailed(recordingId: string, fileSizeBytes: number) {
  await db
    .update(recordings)
    .set({
      uploadStatus: "failed",
      fileSizeBytes,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(recordings.id, recordingId), ne(recordings.uploadStatus, "uploaded")));
}
