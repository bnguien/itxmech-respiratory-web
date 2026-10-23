import { sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { appError, withAppErrors } from "@/lib/app-api/http";
import { authorizeApp } from "@/lib/app-api/server";
import { parseVitalsRange } from "@/lib/app-api/validation";

type BucketRow = {
  bucket: string | Date;
  spo2_mean: number | null;
  spo2_min: number | null;
  spo2_valid: number | null;
  pulse_mean: number | null;
};

/** Lịch sử SpO₂: gộp bản ghi phút theo 1m / 5m / 1h. */
export const GET = withAppErrors("vitals", async (request: NextRequest) => {
  const auth = await authorizeApp(request);
  if (auth.response) return auth.response;
  const params = request.nextUrl.searchParams;
  const range = parseVitalsRange(params.get("from"), params.get("to"), params.get("resolution"));
  if (range.error !== undefined) return appError(400, "VALIDATION_ERROR", range.error);
  const { from, to, bucketSeconds, resolution } = range.data;

  const rows = (await db.execute(sql`
    select to_timestamp(floor(extract(epoch from ts) / ${bucketSeconds}) * ${bucketSeconds}) as bucket,
           avg(spo2_mean)::float8 as spo2_mean,
           min(spo2_min)::float8 as spo2_min,
           avg(spo2_valid)::float8 as spo2_valid,
           avg(pulse_mean)::float8 as pulse_mean
    from vitals_minute
    where patient_id = ${auth.patientId} and ts >= ${from.toISOString()} and ts < ${to.toISOString()}
    group by bucket
    order by bucket
  `)) as unknown as BucketRow[];

  return NextResponse.json({
    resolution,
    points: rows.map((row) => ({
      ts: new Date(row.bucket).toISOString(),
      spo2_mean: row.spo2_mean,
      spo2_min: row.spo2_min,
      spo2_valid: row.spo2_valid ?? 0,
      pulse_mean: row.pulse_mean,
    })),
  });
});
