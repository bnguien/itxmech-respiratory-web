import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordings } from "@/lib/db/schema/recordings";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  internalRecordingError,
  recordingError,
  SIGNED_URL_EXPIRY_SECONDS,
} from "@/lib/recordings/server";
import {
  createSupabaseAdminClient,
  getLungRecordingsBucket,
} from "@/lib/supabase/admin";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ recordingId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { recordingId } = await params;
  if (!uuidPattern.test(recordingId))
    return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");

  try {
    const [recording] = await db
      .select({
        storagePath: recordings.storagePath,
        uploadStatus: recordings.uploadStatus,
      })
      .from(recordings)
      .where(eq(recordings.id, recordingId))
      .limit(1);
    if (!recording)
      return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");
    if (recording.uploadStatus !== "uploaded")
      return recordingError(
        409,
        "RECORDING_NOT_READY",
        "Bản ghi âm chưa sẵn sàng để phát.",
      );

    const { data, error } = await createSupabaseAdminClient()
      .storage.from(getLungRecordingsBucket())
      .createSignedUrl(recording.storagePath, SIGNED_URL_EXPIRY_SECONDS);
    if (error || !data)
      throw error ?? new Error("Signed playback URL was not created.");
    return NextResponse.json({
      data: { url: data.signedUrl, expires_in: SIGNED_URL_EXPIRY_SECONDS },
    });
  } catch (error) {
    return internalRecordingError("Failed to create playback URL", error);
  }
}
