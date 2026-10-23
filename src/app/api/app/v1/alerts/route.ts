import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableAlerts } from "@/lib/db/schema/wearable-alerts";
import { authorizeApp } from "@/lib/app-api/server";
import { serializeAppAlert } from "@/lib/alerts/server";
import { withAppErrors } from "@/lib/app-api/http";

/** Cảnh báo ALERT / CRITICAL của bệnh nhân (sinh từ assessment của vòng), mới nhất trước. `status=open` chỉ lấy đợt đang mở. */
export const GET = withAppErrors("alerts", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get("limit")) || 50, 1), 200);
  const rows = await db
    .select()
    .from(wearableAlerts)
    .where(eq(wearableAlerts.patientId, auth.patientId))
    .orderBy(desc(wearableAlerts.openedAt))
    .limit(limit);
  const data = rows.map(serializeAppAlert);
  const onlyOpen = request.nextUrl.searchParams.get("status") === "open";
  return NextResponse.json({ data: onlyOpen ? data.filter((alert) => alert.status === "OPEN") : data });
});
