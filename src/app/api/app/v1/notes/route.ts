import { NextResponse, type NextRequest } from "next/server";
import { authorizeApp } from "@/lib/app-api/server";
import { listNotes } from "@/lib/notes/server";
import { withAppErrors } from "@/lib/app-api/http";

/**
 * Lời dặn của bác sĩ (một chiều: app chỉ đọc), mới nhất trước. `created_at` là lần sửa cuối (app dùng làm mốc
 * báo lời dặn mới), `edited` cho biết bác sĩ đã sửa sau khi tạo để app ghi "đã sửa" thay vì "lời dặn mới".
 */
export const GET = withAppErrors("notes", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const notes = await listNotes(auth.patientId);
  return NextResponse.json({
    data: notes.map((n) => ({
      id: n.id,
      created_at: n.updated_at,
      doctor_name: n.doctor_name,
      content: n.content,
      edited: n.updated_at !== n.created_at,
    })),
  });
});
