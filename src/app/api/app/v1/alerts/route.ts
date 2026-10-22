import { NextResponse, type NextRequest } from "next/server";
import { authorizeApp } from "@/lib/app-api/server";

/** Cảnh báo. Chưa có bảng alerts (sẽ sinh từ assessments) nên trả danh sách rỗng. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  return NextResponse.json({ data: [] });
}
