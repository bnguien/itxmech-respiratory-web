import { NextResponse, type NextRequest } from "next/server";
import { listDoctorAlerts } from "@/lib/alerts/server";
import { apiError, authorizeDoctor } from "@/lib/patients/server";

/** Cảnh báo ALERT / CRITICAL từ vòng đeo của mọi bệnh nhân, mới nhất trước. */
export async function GET(request: NextRequest) {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  try {
    return NextResponse.json({ data: await listDoctorAlerts(Number.isFinite(limit) ? limit : 50) });
  } catch (error) {
    console.error("Unable to list wearable alerts", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải cảnh báo.");
  }
}
