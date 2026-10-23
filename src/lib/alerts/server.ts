import "server-only";

import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { patients } from "@/lib/db/schema/patients";
import { wearableAlerts, type WearableAlertRow } from "@/lib/db/schema/wearable-alerts";
import { pushToPatient } from "@/lib/push/fcm";
import { alertStatus, alertSummary, EPISODE_GAP_MS, isAlertLevel, planAlert, type AlertLevel } from "./rules";

export interface IncomingAssessment {
  seq: number;
  ts: number; // epoch giây
  level: string;
  trigger: string;
  T: number;
  spo2_now: number | null;
  pulse_now: number | null;
}

export interface AlertEvent {
  kind: "opened" | "escalated";
  alert: WearableAlertRow;
}

/**
 * Sinh / gộp cảnh báo từ các assessment vừa lưu (chỉ các dòng mới, nên gửi lại không báo trùng).
 * Chạy theo thứ tự thời gian, khóa đợt đang có của bệnh nhân để hai lô đến cùng lúc không tạo hai cảnh báo.
 */
export async function recordAlerts(
  patientId: string,
  deviceId: string,
  transport: string,
  items: IncomingAssessment[],
): Promise<AlertEvent[]> {
  const high = items.filter((item) => isAlertLevel(item.level)).sort((a, b) => a.ts - b.ts);
  if (high.length === 0) return [];
  return db.transaction(async (tx) => {
    const events: AlertEvent[] = [];
    for (const item of high) {
      const level = item.level as AlertLevel;
      const tsMs = item.ts * 1000;
      const ts = new Date(tsMs).toISOString();
      const [episode] = await tx
        .select()
        .from(wearableAlerts)
        .where(
          and(
            eq(wearableAlerts.patientId, patientId),
            gte(wearableAlerts.lastSeenAt, new Date(tsMs - EPISODE_GAP_MS).toISOString()),
          ),
        )
        .orderBy(desc(wearableAlerts.lastSeenAt))
        .limit(1)
        .for("update");
      const plan = planAlert(episode ? { ...episode, level: episode.level as AlertLevel } : null, level, tsMs);
      if (plan === "open") {
        const [created] = await tx
          .insert(wearableAlerts)
          .values({
            patientId,
            deviceId,
            level,
            trigger: item.trigger,
            spo2: item.spo2_now,
            pulse: item.pulse_now,
            thresholdT: item.T,
            transport,
            sourceSeq: item.seq,
            openedAt: ts,
            lastSeenAt: ts,
          })
          .returning();
        events.push({ kind: "opened", alert: created });
      } else if (plan === "escalate") {
        const [updated] = await tx
          .update(wearableAlerts)
          .set({
            level,
            trigger: item.trigger,
            spo2: item.spo2_now,
            pulse: item.pulse_now,
            escalatedAt: ts,
            lastSeenAt: ts,
            acknowledgedAt: null,
            acknowledgedBy: null,
            familyAckedAt: null,
            familyAckedBy: null,
          })
          .where(eq(wearableAlerts.id, episode!.id))
          .returning();
        events.push({ kind: "escalated", alert: updated });
      } else if (new Date(episode!.lastSeenAt).getTime() < tsMs) {
        await tx.update(wearableAlerts).set({ lastSeenAt: ts }).where(eq(wearableAlerts.id, episode!.id));
      }
    }
    return events;
  });
}

/** Báo app người nhà qua FCM (ưu tiên cao). Không ném lỗi. */
export async function pushAlertEvents(patientId: string, events: AlertEvent[]) {
  for (const { alert } of events) {
    await pushToPatient(
      patientId,
      {
        type: "alert_opened",
        alert_id: alert.id,
        level: alert.level,
        summary_vi: alertSummary(alert.level, alert.trigger, alert.spo2, alert.pulse),
        opened_at: alert.openedAt,
      },
      { highPriority: true },
    );
  }
}

export function serializeDoctorAlert(alert: WearableAlertRow, patientName: string, patientCode: string) {
  return {
    id: alert.id,
    patient_id: alert.patientId,
    patient_name: patientName,
    patient_code: patientCode,
    device_id: alert.deviceId,
    level: alert.level as AlertLevel,
    trigger: alert.trigger,
    summary: alertSummary(alert.level, alert.trigger, alert.spo2, alert.pulse),
    spo2: alert.spo2,
    pulse: alert.pulse,
    threshold_t: alert.thresholdT,
    transport: alert.transport,
    opened_at: alert.openedAt,
    last_seen_at: alert.lastSeenAt,
    escalated_at: alert.escalatedAt,
    acknowledged_at: alert.acknowledgedAt,
    family_acked_at: alert.familyAckedAt,
    family_acked_by: alert.familyAckedBy,
    status: alertStatus(alert),
  };
}

export type DoctorAlert = ReturnType<typeof serializeDoctorAlert>;

/** Cảnh báo cho trang bác sĩ, mới nhất trước, kèm tên bệnh nhân. */
export async function listDoctorAlerts(limit = 50): Promise<DoctorAlert[]> {
  const rows = await db
    .select({ alert: wearableAlerts, patientName: patients.fullName, patientCode: patients.patientCode })
    .from(wearableAlerts)
    .innerJoin(patients, eq(patients.id, wearableAlerts.patientId))
    .orderBy(desc(wearableAlerts.lastSeenAt))
    .limit(Math.min(Math.max(limit, 1), 200));
  return rows.map(({ alert, patientName, patientCode }) => serializeDoctorAlert(alert, patientName, patientCode));
}

/** Dạng AlertDto của app người nhà. */
export function serializeAppAlert(alert: WearableAlertRow) {
  const acks = [
    ...(alert.familyAckedAt ? [{ display_name: alert.familyAckedBy ?? "Người nhà", role: "family", at: alert.familyAckedAt }] : []),
    ...(alert.acknowledgedAt ? [{ display_name: "Bác sĩ", role: "doctor", at: alert.acknowledgedAt }] : []),
  ];
  const status = alertStatus(alert);
  return {
    alert_id: alert.id,
    level: alert.level,
    status,
    opened_at: alert.openedAt,
    resolved_at: status === "RESOLVED" ? alert.lastSeenAt : null,
    summary_vi: alertSummary(alert.level, alert.trigger, alert.spo2, alert.pulse),
    spo2_at_open: alert.spo2,
    recommended_action:
      alert.level === "CRITICAL"
        ? "Kiểm tra người bệnh ngay. Nếu khó thở, tím tái hoặc lơ mơ, gọi cấp cứu 115."
        : "Cho người bệnh nghỉ ngơi, kiểm tra vòng đeo đúng cách và theo dõi thêm.",
    acks,
    feedback: alert.feedback ?? null,
  };
}
