import { and, avg, desc, eq, gte, isNull, min } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";
import { vitalsMinute, wearableAssessments } from "@/lib/db/schema/wearables";
import { liveLevel, riskOf, summaryOf } from "@/lib/app-api/live";
import { authorizeApp, currentDeviceOf } from "@/lib/app-api/server";

/** Trạng thái hiện tại ghép từ bản ghi phút, assessment và trạng thái vòng mới nhất. */
export async function GET(request: NextRequest) {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const patientId = auth.patientId;
  const now = Date.now();
  const since = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  const [[vital], [assessment], [last10], [last60], device, [gateway]] = await Promise.all([
    db.select().from(vitalsMinute).where(eq(vitalsMinute.patientId, patientId)).orderBy(desc(vitalsMinute.ts)).limit(1),
    db
      .select({ level: wearableAssessments.level, reasons: wearableAssessments.reasons })
      .from(wearableAssessments)
      .where(eq(wearableAssessments.patientId, patientId))
      .orderBy(desc(wearableAssessments.ts))
      .limit(1),
    db
      .select({ value: min(vitalsMinute.spo2Min) })
      .from(vitalsMinute)
      .where(and(eq(vitalsMinute.patientId, patientId), gte(vitalsMinute.ts, since(10)))),
    db
      .select({ value: avg(vitalsMinute.spo2Valid) })
      .from(vitalsMinute)
      .where(and(eq(vitalsMinute.patientId, patientId), gte(vitalsMinute.ts, since(60)))),
    currentDeviceOf(patientId),
    db
      .select({ viewerName: appSessions.viewerName })
      .from(appSessions)
      .where(and(eq(appSessions.patientId, patientId), eq(appSessions.isBleGateway, true), isNull(appSessions.revokedAt)))
      .limit(1),
  ]);

  const level = liveLevel(vital?.ts ?? null, assessment?.level ?? null, now);
  return NextResponse.json({
    state: level,
    measured_at: vital ? new Date(vital.ts).toISOString() : new Date(now).toISOString(),
    spo2: vital?.spo2Mean ?? null,
    pulse: vital?.pulseMean != null ? Math.round(vital.pulseMean) : null,
    spo2_min_10m: last10?.value ?? null,
    spo2_slope_30m: null,
    baseline_spo2: null,
    risk: riskOf(level),
    reasons: assessment?.reasons ?? [],
    summary_vi: summaryOf(level),
    device: {
      device_id: device?.deviceId ?? "",
      battery_pct: device?.batteryPct ?? null,
      worn: device?.worn ?? false,
      transport: device?.transport ?? "none",
      gateway_viewer_name: gateway?.viewerName ?? null,
      last_seen_at: device?.lastSeenAt ? new Date(device.lastSeenAt).toISOString() : null,
      pending_backlog: device?.backlog ?? 0,
      applied_config_version: device?.appliedConfigVersion ?? 0,
    },
    signal: { sqi: vital?.sqi ?? 0, valid_frac_60m: last60?.value != null ? Number(last60.value) : 0 },
  });
}
