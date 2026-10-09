import { and, count, desc, eq, inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { recordings } from "@/lib/db/schema/recordings";
import { patients } from "@/lib/db/schema/patients";
import { visits } from "@/lib/db/schema/visits";
import { respiratoryCycles } from "@/lib/db/schema/respiratory-cycles";
import { authorizeDoctor } from "@/lib/patients/server";
import { internalRecordingError, recordingError } from "@/lib/recordings/server";
import { uuidPattern } from "@/lib/visits/validation";

export async function GET(request: NextRequest) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const page = Number(request.nextUrl.searchParams.get("page") ?? "1");
  const id = request.nextUrl.searchParams.get("id");
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000 || (id !== null && !uuidPattern.test(id)))
    return recordingError(400, "VALIDATION_ERROR", "Tham số danh sách không hợp lệ.");
  try {
    const result = await db.transaction(async (tx) => {
      const where = and(id ? eq(recordings.id, id) : eq(recordings.uploadStatus, "uploaded"));
      const [{ total }] = await tx.select({ total: count() }).from(recordings).where(where);
      const rows = await tx.select({
        id: recordings.id, visit_id: visits.id, patient_id: patients.id,
        patient_name: patients.fullName, patient_code: patients.patientCode,
        date_of_birth: patients.dateOfBirth, gender: patients.gender, phone: patients.phone,
        visit_started_at: visits.startedAt, uploaded_at: recordings.uploadedAt,
        duration_ms: recordings.durationMs, analysis_status: recordings.analysisStatus,
      }).from(recordings).innerJoin(visits, eq(recordings.visitId, visits.id))
        .innerJoin(patients, eq(visits.patientId, patients.id)).where(where)
        .orderBy(desc(recordings.uploadedAt), desc(recordings.id)).limit(20).offset((page - 1) * 20);
      const cycles = rows.length ? await tx.select().from(respiratoryCycles)
        .where(inArray(respiratoryCycles.recordingId, rows.map((row) => row.id))) : [];
      return {
        data: rows.map((row) => {
          const items = cycles.filter((cycle) => cycle.recordingId === row.id);
          return { ...row, labels: [...new Set(items.map((cycle) => cycle.doctorLabel ?? cycle.aiLabel).filter(Boolean))],
            cycle_count: items.length, reviewed_count: items.filter((cycle) => cycle.reviewStatus !== "pending").length };
        }),
        pagination: { page, total, total_pages: Math.ceil(total / 20) },
      };
    }, { isolationLevel: "repeatable read", accessMode: "read only" });
    return NextResponse.json(result);
  } catch (error) { return internalRecordingError("list", error); }
}
