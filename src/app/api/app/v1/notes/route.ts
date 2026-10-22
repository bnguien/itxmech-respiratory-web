import { NextResponse, type NextRequest } from "next/server";
import { authorizeApp } from "@/lib/app-api/server";
import { listNotes } from "@/lib/notes/server";

/** Lời dặn của bác sĩ (một chiều: app chỉ đọc), mới nhất trước. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const notes = await listNotes(auth.patientId);
  return NextResponse.json({
    data: notes.map((n) => ({ id: n.id, created_at: n.updated_at, doctor_name: n.doctor_name, content: n.content })),
  });
}
