import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { recordings } from "@/lib/db/schema/recordings";
import { visits } from "@/lib/db/schema/visits";
import {
  authorizeDevice,
  internalRecordingError,
  recordingError,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/recordings/server";
import {
  createSupabaseAdminClient,
  getLungRecordingsBucket,
} from "@/lib/supabase/admin";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ visitId: string }> };

export async function POST(request: NextRequest, { params }: Context) {
  const unauthorized = authorizeDevice(request);
  if (unauthorized) return unauthorized;
  const { visitId } = await params;
  if (!uuidPattern.test(visitId))
    return recordingError(404, "NOT_FOUND", "Không tìm thấy lần khám.");

  try {
    const [visit] = await db
      .select({
        id: visits.id,
        status: visits.status,
        archivedAt: patients.archivedAt,
      })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(eq(visits.id, visitId))
      .limit(1);
    if (!visit)
      return recordingError(404, "NOT_FOUND", "Không tìm thấy lần khám.");

    let [recording] = await db
      .select({
        id: recordings.id,
        storagePath: recordings.storagePath,
        uploadStatus: recordings.uploadStatus,
      })
      .from(recordings)
      .where(eq(recordings.visitId, visitId))
      .limit(1);

    if (!recording) {
      if (visit.status !== "in_progress")
        return recordingError(
          409,
          "INVALID_VISIT_STATE",
          "Không thể tạo bản ghi mới cho lần khám đã kết thúc.",
        );
      if (visit.archivedAt)
        return recordingError(
          409,
          "INVALID_VISIT_STATE",
          "Không thể tạo bản ghi mới cho bệnh nhân đã lưu trữ.",
        );

      const recordingId = randomUUID();
      await db
        .insert(recordings)
        .values({
          id: recordingId,
          visitId,
          storagePath: `recordings/${visitId}/${recordingId}.wav`,
        })
        .onConflictDoNothing({ target: recordings.visitId });
      [recording] = await db
        .select({
          id: recordings.id,
          storagePath: recordings.storagePath,
          uploadStatus: recordings.uploadStatus,
        })
        .from(recordings)
        .where(eq(recordings.visitId, visitId))
        .limit(1);
    }

    if (!recording)
      return recordingError(
        409,
        "RECORDING_ALREADY_EXISTS",
        "Không thể cấp lại phiên upload cho bản ghi này.",
      );
    if (recording.uploadStatus === "uploaded")
      return recordingError(
        409,
        "RECORDING_ALREADY_UPLOADED",
        "Bản ghi âm đã được tải lên hoàn tất.",
      );
    if (
      !(["waiting_upload", "failed"] as string[]).includes(
        recording.uploadStatus,
      )
    )
      return recordingError(
        409,
        "RECORDING_ALREADY_EXISTS",
        "Trạng thái bản ghi không thể cấp URL upload.",
      );

    if (recording.uploadStatus === "failed") {
      await db
        .update(recordings)
        .set({
          uploadStatus: "waiting_upload",
          updatedAt: new Date().toISOString(),
        })
        .where(eq(recordings.id, recording.id));
    }

    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(getLungRecordingsBucket())
      .createSignedUploadUrl(recording.storagePath, { upsert: true });
    if (error || !data)
      throw error ?? new Error("Signed upload URL was not created.");

    return NextResponse.json({
      data: {
        recording_id: recording.id,
        visit_id: visitId,
        upload_url: data.signedUrl,
        expires_in: SIGNED_URL_EXPIRY_SECONDS,
      },
    });
  } catch (error) {
    return internalRecordingError("Failed to create signed upload URL", error);
  }
}
