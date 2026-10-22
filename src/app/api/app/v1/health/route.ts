import { NextResponse } from "next/server";

/** App gọi để kiểm tra kết nối tới server (không cần đăng nhập). */
export async function GET() {
  return NextResponse.json({ status: "ok", api: "app/v1", server_time: Math.floor(Date.now() / 1000) });
}
