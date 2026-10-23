import "server-only";

import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { doctorNotes } from "@/lib/db/schema/doctor-notes";
import { doctorProfiles } from "@/lib/db/schema/doctor-profiles";

export const NOTE_MAX_LENGTH = 2000;

export interface DoctorNoteRecord {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  doctor_name: string;
}

/** Lời dặn còn hiệu lực của bệnh nhân, mới nhất trước. Dùng chung cho web bác sĩ và app người nhà. */
export async function listNotes(patientId: string): Promise<DoctorNoteRecord[]> {
  const rows = await db
    .select({ note: doctorNotes, doctorName: doctorProfiles.fullName })
    .from(doctorNotes)
    .leftJoin(doctorProfiles, eq(doctorProfiles.id, doctorNotes.doctorId))
    .where(and(eq(doctorNotes.patientId, patientId), isNull(doctorNotes.deletedAt)))
    .orderBy(desc(doctorNotes.createdAt))
    .limit(100);
  return rows.map(({ note, doctorName }) => ({
    id: note.id,
    content: note.content,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
    doctor_name: doctorName ?? "Bác sĩ",
  }));
}

/** Chuẩn hóa nội dung lời dặn; null nếu rỗng hoặc quá dài. */
export function cleanNoteContent(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= 1 && text.length <= NOTE_MAX_LENGTH ? text : null;
}
