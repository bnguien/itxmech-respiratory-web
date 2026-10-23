import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableAlerts } from "@/lib/db/schema/wearable-alerts";
import { appError, readJsonObject, withAppErrors } from "@/lib/app-api/http";
import { authorizeApp } from "@/lib/app-api/server";
import { uuidPattern } from "@/lib/visits/validation";

type Context = { params: Promise<{ id: string }> };

/** Người nhà góp ý cảnh báo đúng / sai (verdict, reason_code, note). Lưu nguyên để bác sĩ xem lại. */
export const PUT = withAppErrors("alerts/feedback", async (request: NextRequest, { params }: Context) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const { id } = await params;
  if (!uuidPattern.test(id)) return appError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
  const body = await readJsonObject(request);
  const verdict = typeof body?.verdict === "string" ? body.verdict.slice(0, 40) : "";
  if (!verdict) return appError(400, "VALIDATION_ERROR", "Thiếu verdict.");
  const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : null);
  const [row] = await db
    .update(wearableAlerts)
    .set({
      feedback: {
        verdict,
        reason_code: text(body?.reason_code, 40),
        note: text(body?.note, 500),
        display_name: auth.viewerName,
        role: "family",
        at: new Date().toISOString(),
      },
    })
    .where(and(eq(wearableAlerts.id, id), eq(wearableAlerts.patientId, auth.patientId)))
    .returning({ id: wearableAlerts.id });
  if (!row) return appError(404, "NOT_FOUND", "Không tìm thấy cảnh báo.");
  return new Response(null, { status: 204 });
});
