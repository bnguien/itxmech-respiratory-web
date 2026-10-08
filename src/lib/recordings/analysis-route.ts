import "server-only";
import { NextResponse } from "next/server";
import { authorizeDoctor } from "@/lib/patients/server";
import { uuidPattern } from "@/lib/visits/validation";
import { AnalysisError } from "./ai-client";
import { internalRecordingError, recordingError } from "./server";

export async function handleAnalysis(params: Promise<{ recordingId: string }>, action: (id: string) => Promise<unknown>) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { recordingId } = await params;
  if (!uuidPattern.test(recordingId)) return recordingError(404, "NOT_FOUND", "Không tìm thấy bản ghi âm.");
  try {
    return NextResponse.json({ data: await action(recordingId) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof AnalysisError) return recordingError(error.status, error.code, error.message);
    return internalRecordingError("Analysis failed", error);
  }
}
