import { NextResponse } from "next/server";
import { getAuthenticatedDoctor } from "@/lib/auth/server";

export async function GET() {
  const doctor = await getAuthenticatedDoctor();

  if (!doctor) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để thực hiện yêu cầu này." },
      { status: 401 },
    );
  }

  return NextResponse.json({ doctor });
}
