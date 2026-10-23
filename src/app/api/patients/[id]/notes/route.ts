import { and, eq, isNull } from "drizzle-orm";
import { after, NextResponse, type NextRequest } from "next/server";
import { pushToPatient } from "@/lib/push/fcm";
import { db } from "@/lib/db";
import { doctorNotes } from "@/lib/db/schema/doctor-notes";
import { patients } from "@/lib/db/schema/patients";
import { cleanNoteContent, listNotes, NOTE_MAX_LENGTH } from "@/lib/notes/server";
import { apiError, authorizeDoctor, validationError } from "@/lib/patients/server";

type Context = { params: Promise<{ id: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function activePatientExists(id: string) {
  const [row] = await db.select({ id: patients.id }).from(patients).where(and(eq(patients.id, id), isNull(patients.archivedAt))).limit(1);
  return !!row;
}

/** Lời dặn của bác sĩ cho bệnh nhân (người nhà đọc trên app). */
export async function GET(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  try {
    return NextResponse.json({ data: await listNotes(id) });
  } catch (error) {
    console.error("Unable to list notes", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải lời dặn.");
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
  let content: string | null = null;
  try {
    content = cleanNoteContent(((await request.json()) as { content?: unknown }).content);
  } catch {
    // JSON lỗi: báo bên dưới.
  }
  if (!content) return validationError([{ field: "content", message: `Lời dặn từ 1 đến ${NOTE_MAX_LENGTH} ký tự.` }]);
  try {
    if (!(await activePatientExists(id))) return apiError(404, "NOT_FOUND", "Không tìm thấy bệnh nhân.");
    const [note] = await db.insert(doctorNotes).values({ patientId: id, doctorId: auth.doctorId, content }).returning({ id: doctorNotes.id });
    // App nhận tin rồi tự tải lại và hiện một thông báo lời dặn (DoctorNoteWatcher), kể cả khi đang chạy nền.
    after(() => pushToPatient(id, { type: "note_added", note_id: note.id }));
    return NextResponse.json({ data: await listNotes(id) }, { status: 201 });
  } catch (error) {
    console.error("Unable to create note", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể lưu lời dặn.");
  }
}
