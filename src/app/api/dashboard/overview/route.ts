import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { classify, rankPatients, type DashboardOverview } from "@/lib/dashboard/overview";
import { apiError, authorizeDoctor } from "@/lib/patients/server";
import type { CycleLabel } from "@/types/analysis";
import type { WearableLevel } from "@/types/wearable";

type Row = {
  id: string;
  patient_code: string;
  full_name: string;
  background_diagnosis: string | null;
  spo2: number | null;
  vital_ts: string | null;
  level: string | null;
  threshold_t: number | null;
  sound: string | null;
};

const LIST_LIMIT = 8;

/**
 * Tổng quan cho dashboard bác sĩ từ dữ liệu thật: SpO₂ phút gần nhất (30 phút), mức vòng báo trong 1 giờ,
 * ngưỡng T của từng bệnh nhân, nhãn âm phổi phổ biến nhất của bản ghi gần nhất, số bản ghi âm phổi chờ xác nhận.
 */
export async function GET() {
  const auth = await authorizeDoctor();
  if (auth.response) return auth.response;
  try {
    const [rows, pending] = await Promise.all([
      db.execute(sql`
        with v as (
          select distinct on (patient_id) patient_id, spo2_mean, ts
          from vitals_minute where ts > now() - interval '30 minutes'
          order by patient_id, ts desc
        ), a as (
          select distinct on (patient_id) patient_id, level
          from assessments where ts > now() - interval '1 hour'
          order by patient_id, ts desc
        ), c as (
          select distinct on (patient_id) patient_id, threshold_t
          from monitoring_configs order by patient_id, version desc
        ), r as (
          select distinct on (vi.patient_id) vi.patient_id, rec.id as recording_id
          from recordings rec join visits vi on vi.id = rec.visit_id
          where rec.analysis_status = 'completed'
          order by vi.patient_id, rec.created_at desc
        ), s as (
          select r.patient_id, (
            select coalesce(rc.doctor_label, rc.ai_label) from respiratory_cycles rc
            where rc.recording_id = r.recording_id and coalesce(rc.doctor_label, rc.ai_label) is not null
            group by 1 order by count(*) desc limit 1
          ) as sound
          from r
        )
        select p.id, p.patient_code, p.full_name, p.background_diagnosis,
               v.spo2_mean::float8 as spo2, v.ts as vital_ts, a.level, c.threshold_t, s.sound
        from patients p
        left join v on v.patient_id = p.id
        left join a on a.patient_id = p.id
        left join c on c.patient_id = p.id
        left join s on s.patient_id = p.id
        where p.archived_at is null
      `) as unknown as Promise<Row[]>,
      db.execute(sql`
        select count(distinct rec.id)::int as value
        from recordings rec join respiratory_cycles rc on rc.recording_id = rec.id
        where rec.analysis_status = 'completed' and rc.review_status = 'pending'
      `) as unknown as Promise<Array<{ value: number }>>,
    ]);

    const patients = rankPatients(
      rows.map((r) =>
        classify({
          id: r.id,
          code: r.patient_code,
          name: r.full_name,
          diagnosis: r.background_diagnosis,
          spo2: r.spo2 !== null ? Math.round(r.spo2 * 10) / 10 : null,
          level: (r.level as WearableLevel | null) ?? null,
          T: r.threshold_t ?? 88,
          lastSeen: r.vital_ts ? new Date(r.vital_ts).toISOString() : null,
          sound: (r.sound as CycleLabel | null) ?? null,
        }),
      ),
    );
    const focus = patients.find((p) => p.spo2 !== null) ?? null;
    const body: DashboardOverview = {
      totals: {
        attention: patients.filter((p) => p.needs_attention).length,
        spo2_low: patients.filter((p) => p.spo2 !== null && p.spo2 < p.T).length,
        pending_recordings: pending[0]?.value ?? 0,
        monitored: patients.filter((p) => p.spo2 !== null).length,
      },
      patients: patients.slice(0, LIST_LIMIT),
      focus_patient: focus ? { id: focus.id, name: focus.name } : null,
    };
    return NextResponse.json({ data: body });
  } catch (error) {
    console.error("Unable to build dashboard overview", error);
    return apiError(500, "INTERNAL_ERROR", "Không thể tải tổng quan.");
  }
}
