import { and, eq, isNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { doctorNotes } from "@/lib/db/schema/doctor-notes";
import { cleanNoteContent, listNotes, NOTE_MAX_LENGTH } from "@/lib/notes/server";
import { apiError, authorizeDoctor, validationError } from "@/lib/patients/server";

type Context = { params: Promise<{ id: string; noteId: string }> };
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const target = (patientId: string, noteId: string) =>
  and(eq(doctorNotes.id, noteId), eq(doctorNotes.patientId, patientId), isNull(doctorNotes.deletedAt));

/** Sửa lời dặn: app thấy nội dung mới ở lần tải sau. */
export async function PATCH(request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id, noteId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(noteId)) return apiError(404, "NOT_FOUND", "Không tìm thấy lời dặn.");
  let content: string | null = null;
  try {
    content = cleanNoteContent(((await request.json()) as { content?: unknown }).content);
  } catch {
    // JSON lỗi: báo bên dưới.
  }
  if (!content) return validationError([{ field: "content", message: `Lời dặn từ 1 đến ${NOTE_MAX_LENGTH} ký tự.` }]);
  try {
    const updated = await db
      .update(doctorNotes)
      .set({ content, doctorId: auth.doctorId, updatedAt: new Date().toISOString() })
      .where(target(id, noteId))
      .returning({ id: doctorNotes.id });
    if (updated.length === 0) return apiError(404, "NOT_FOUND", "Không tìm thấy lời dặn.");
    return NextResponse.json({ data: await listNotes(id) });
  } catch (error) {
    console.error("Unable to update note", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể sửa lời dặn.");
  }
}

/** Xóa mềm: lời dặn biến mất khỏi app ở lần tải sau, vẫn còn trong DB để tra cứu. */
export async function DELETE(_request: NextRequest, { params }: Context) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const { id, noteId } = await params;
  if (!uuidPattern.test(id) || !uuidPattern.test(noteId)) return apiError(404, "NOT_FOUND", "Không tìm thấy lời dặn.");
  try {
    const deleted = await db
      .update(doctorNotes)
      .set({ deletedAt: new Date().toISOString() })
      .where(target(id, noteId))
      .returning({ id: doctorNotes.id });
    if (deleted.length === 0) return apiError(404, "NOT_FOUND", "Không tìm thấy lời dặn.");
    return NextResponse.json({ data: await listNotes(id) });
  } catch (error) {
    console.error("Unable to delete note", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể xóa lời dặn.");
  }
}
