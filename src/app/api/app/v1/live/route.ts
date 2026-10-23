import { and, avg, desc, eq, gte, isNull, min } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appSessions } from "@/lib/db/schema/app-access";
import { vitalsMinute, wearableAssessments, wearableLive } from "@/lib/db/schema/wearables";
import { buildLiveSnapshot, riskOf } from "@/lib/app-api/live";
import { latestConfig } from "@/lib/monitoring/server";
import { authorizeApp, currentDeviceOf } from "@/lib/app-api/server";
import { withAppErrors } from "@/lib/app-api/http";

const toEpoch = (iso: string) => Math.floor(new Date(iso).getTime() / 1000);

/**
 * Trạng thái hiện tại, giống hệt cho mọi máy của bệnh nhân (máy đang nối vòng cũng đối chiếu được):
 * số 15 giây mới nhất (app gateway chuyển lên) hoặc bản ghi phút, kèm giờ đo và trạng thái kết nối.
 */
export const GET = withAppErrors("live", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const patientId = auth.patientId;
  const now = Date.now();
  const since = (minutes: number) => new Date(now - minutes * 60_000).toISOString();

  const [[vital], [assessment], [last10], [last60], device, [gateway], config] = await Promise.all([
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
    latestConfig(patientId),
  ]);
  const [live] = device
    ? await db.select().from(wearableLive).where(eq(wearableLive.deviceId, device.deviceId)).limit(1)
    : [];

  const snapshot = buildLiveSnapshot({
    live: live
      ? { ts: toEpoch(live.ts), spo2: live.spo2, spo2_min: live.spo2Min, pulse: live.pulse, worn: live.worn }
      : null,
    minute: vital
      ? {
          ts: toEpoch(vital.ts),
          spo2_mean: vital.spo2Mean,
          spo2_min: vital.spo2Min,
          pulse_mean: vital.pulseMean,
          worn: vital.worn ?? false,
        }
      : null,
    assessmentLevel: assessment?.level ?? null,
    device: device
      ? {
          // ingest/live chỉ dời last_seen_at mỗi phút; lần nhận số 15 giây gần nhất nằm ở received_at.
          ts: Math.max(device.lastSeenAt ? toEpoch(device.lastSeenAt) : 0, live ? toEpoch(live.receivedAt) : 0),
          transport: device.transport === "wifi" ? "wifi" : "ble_relay",
          worn: device.worn ?? false,
        }
      : null,
    uploadIntervalMin: config.thresholds.upload_interval_min,
    nowSeconds: Math.floor(now / 1000),
  });
  const reading = snapshot.reading;
  const fresh = snapshot.fresh;
  return NextResponse.json({
    state: snapshot.state,
    measured_at: new Date((reading?.ts ?? Math.floor(now / 1000)) * 1000).toISOString(),
    // Mất kết nối: không trả số cũ như số hiện tại; app hiện "—" kèm lời giải thích.
    spo2: fresh ? (reading?.spo2 ?? null) : null,
    pulse: fresh && reading?.pulse != null ? Math.round(reading.pulse) : null,
    spo2_min_10m: last10?.value ?? null,
    spo2_slope_30m: null,
    baseline_spo2: null,
    risk: riskOf(snapshot.state),
    reasons: fresh ? (assessment?.reasons ?? []) : [],
    summary_vi: snapshot.summary,
    reading_source: reading?.source ?? null,
    last_spo2: reading?.spo2 ?? null,
    connection: {
      kind: snapshot.connection.kind,
      title: snapshot.connection.title,
      detail: snapshot.connection.detail,
      fresh,
    },
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
    signal: { sqi: live?.sqi ?? vital?.sqi ?? 0, valid_frac_60m: last60?.value != null ? Number(last60.value) : 0 },
  });
});
