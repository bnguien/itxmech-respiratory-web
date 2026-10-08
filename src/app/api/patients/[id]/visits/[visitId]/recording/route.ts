import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { recordings } from "@/lib/db/schema/recordings";
import { visits } from "@/lib/db/schema/visits";
import { authorizeDoctor } from "@/lib/patients/server";
import {
  internalRecordingError,
  recordingError,
  recordingSelection,
  serializeRecording,
} from "@/lib/recordings/server";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string; visitId: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id: patientId, visitId } = await params;
  if (!uuidPattern.test(patientId) || !uuidPattern.test(visitId))
    return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");

  try {
    const [visit] = await db
      .select({ id: visits.id })
      .from(visits)
      .innerJoin(patients, eq(visits.patientId, patients.id))
      .where(and(eq(visits.id, visitId), eq(visits.patientId, patientId)))
      .limit(1);
    if (!visit)
      return recordingError(
        404,
        "NOT_FOUND",
        "Không tìm thấy lần khám của bệnh nhân.",
      );

    const [recording] = await db
      .select(recordingSelection)
      .from(recordings)
      .where(eq(recordings.visitId, visitId))
      .limit(1);
    if (!recording)
      return recordingError(
        404,
        "NOT_FOUND",
        "Chưa có bản ghi âm cho lần khám này.",
      );
    return NextResponse.json({ data: serializeRecording(recording) });
  } catch (error) {
    return internalRecordingError("Failed to get visit recording", error);
  }
}
