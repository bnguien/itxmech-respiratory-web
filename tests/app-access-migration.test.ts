import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

// Chạy migration 0010 trên Postgres trong bộ nhớ, với phần tối thiểu của Supabase (auth, vai trò) và bảng có sẵn.
const SUPABASE_STUBS = `
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA auth;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
  CREATE TABLE public.doctor_profiles (id uuid PRIMARY KEY, full_name text NOT NULL);
  CREATE TABLE public.patients (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), patient_code text UNIQUE NOT NULL);
`;

async function migrated() {
  const db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  const sql = readFileSync(new URL("../drizzle/0010_app_access_and_wearables.sql", import.meta.url), "utf8");
  for (const statement of sql.split("--> statement-breakpoint")) {
    if (statement.trim()) await db.exec(statement);
  }
  return db;
}

describe("migration 0010", () => {
  it("tạo bảng, upsert bản ghi phút không trùng, chặn gán một vòng cho hai bệnh nhân", async () => {
    const db = await migrated();
    const { rows } = await db.query<{ id: string }>(
      "INSERT INTO patients (patient_code) VALUES ('PAT-000001'), ('PAT-000002') RETURNING id",
    );
    const [p1, p2] = rows.map((r) => r.id);

    await db.query("INSERT INTO patient_app_access (patient_id, access_code_hash) VALUES ($1, 'scrypt$a$b')", [p1]);
    await db.query(
      "INSERT INTO app_sessions (patient_id, viewer_name, role, refresh_token_hash, refresh_expires_at) VALUES ($1, 'Lan', 'family', 'h', now())",
      [p1],
    );
    await expect(
      db.query(
        "INSERT INTO app_sessions (patient_id, viewer_name, role, refresh_token_hash, refresh_expires_at) VALUES ($1, 'X', 'admin', 'h', now())",
        [p1],
      ),
    ).rejects.toThrow();

    await db.exec("INSERT INTO wearable_devices (device_id) VALUES ('WB-C3-0001')");
    await db.query("INSERT INTO device_assignments (device_id, patient_id) VALUES ('WB-C3-0001', $1)", [p1]);
    await expect(
      db.query("INSERT INTO device_assignments (device_id, patient_id) VALUES ('WB-C3-0001', $1)", [p2]),
    ).rejects.toThrow();

    const insertVital = `INSERT INTO vitals_minute (device_id, seq, patient_id, ts, spo2_valid, transport)
      VALUES ('WB-C3-0001', 1, $1, now(), 1, 'ble_relay') ON CONFLICT DO NOTHING RETURNING seq`;
    expect((await db.query(insertVital, [p1])).rows).toHaveLength(1);
    expect((await db.query(insertVital, [p1])).rows).toHaveLength(0);

    await db.query(
      `INSERT INTO assessments (device_id, seq, patient_id, ts, level, trigger, notify, ran_model, threshold_t, config_version, model_version)
       VALUES ('WB-C3-0001', 1, $1, now(), 'ALERT', 'ml_risk', '{"alert":true}', true, 88, 0, 'm')`,
      [p1],
    );
    const published = await db.query<{ tablename: string }>(
      "SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename",
    );
    expect(published.rows.map((r) => r.tablename)).toEqual(["assessments", "vitals_minute", "wearable_devices"]);
    await db.close();
  }, 60_000);   // PGlite khởi động mất vài giây
});
