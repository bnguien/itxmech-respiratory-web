import { count, desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { recordings } from "@/lib/db/schema/recordings";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  internalRecordingError,
  recordingError,
} from "@/lib/recordings/server";
import type {
  RecordingSummary,
  RecordingUploadStatus,
} from "@/types/recording";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id: patientId } = await params;
  if (!uuidPattern.test(patientId))
    return recordingError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "20");
  if (
    !Number.isInteger(page) ||
    page < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    return recordingError(
      400,
      "VALIDATION_ERROR",
      "Trang phải từ 1 và giới hạn phải từ 1 đến 100.",
    );

  try {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);
    if (!patient)
      return recordingError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");

    const where = eq(visits.patientId, patientId);
    const [rows, totals] = await Promise.all([
      db
        .select({
          id: recordings.id,
          visitId: recordings.visitId,
          uploadStatus: recordings.uploadStatus,
          fileSizeBytes: recordings.fileSizeBytes,
          durationMs: recordings.durationMs,
          sampleRateHz: recordings.sampleRateHz,
          bitDepth: recordings.bitDepth,
          channelCount: recordings.channelCount,
          uploadedAt: recordings.uploadedAt,
          patientId: patients.id,
          patientName: patients.fullName,
          patientCode: patients.patientCode,
          visitStartedAt: visits.startedAt,
        })
        .from(recordings)
        .innerJoin(visits, eq(recordings.visitId, visits.id))
        .innerJoin(patients, eq(visits.patientId, patients.id))
        .where(where)
        .orderBy(desc(recordings.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      db
        .select({ value: count() })
        .from(recordings)
        .innerJoin(visits, eq(recordings.visitId, visits.id))
        .where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    const data: RecordingSummary[] = rows.map((row) => ({
      id: row.id,
      visit_id: row.visitId,
      upload_status: row.uploadStatus as RecordingUploadStatus,
      file_size_bytes: row.fileSizeBytes,
      duration_ms: row.durationMs,
      sample_rate_hz: row.sampleRateHz,
      bit_depth: row.bitDepth,
      channel_count: row.channelCount,
      uploaded_at: row.uploadedAt,
      patient_id: row.patientId,
      patient_name: row.patientName,
      patient_code: row.patientCode,
      visit_started_at: row.visitStartedAt,
    }));
    return NextResponse.json({
      data,
      pagination: { page, limit, total, total_pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return internalRecordingError("Failed to list patient recordings", error);
  }
}
