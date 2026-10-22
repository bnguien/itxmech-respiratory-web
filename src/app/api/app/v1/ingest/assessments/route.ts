import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { wearableAssessments } from "@/lib/db/schema/wearables";
import { appError, epochToIso, readJsonObject } from "@/lib/app-api/http";
import { authorizeApp, ensureDeviceForPatient } from "@/lib/app-api/server";
import { validateAssessments } from "@/lib/app-api/validation";

/** Kết quả luật + model của vòng. Upsert theo (device_id, seq). */
export async function POST(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const parsed = validateAssessments(await readJsonObject(request));
  if (parsed.error !== undefined) return appError(400, "VALIDATION_ERROR", parsed.error);
  const { device_id, items } = parsed.data;

  const owner = await ensureDeviceForPatient(device_id, auth.patientId);
  if (!owner.ok) return owner.response;
  if (items.length === 0) return NextResponse.json({ accepted: 0 });

  const inserted = await db
    .insert(wearableAssessments)
    .values(
      items.map((a) => ({
        deviceId: device_id,
        seq: a.seq,
        patientId: auth.patientId,
        ts: epochToIso(a.ts),
        level: a.level,
        trigger: a.trigger,
        notify: a.notify,
        ranModel: a.ran_model,
        outQ: a.out_q,
        thresholdT: a.T,
        spo2Now: a.spo2_now,
        pulseNow: a.pulse_now,
        reasons: a.reasons,
        localNotified: a.local_notified,
        configVersion: a.config_version,
        modelVersion: a.model_version,
      })),
    )
    .onConflictDoNothing()
    .returning({ seq: wearableAssessments.seq });
  return NextResponse.json({ accepted: inserted.length });
}
