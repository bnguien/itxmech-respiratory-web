// Opt-in live check: persists analysis for the supplied uploaded recording.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

dotenv.config({ path: ".env.local", quiet: true });
const recordingId = process.argv[2];
assert(
  recordingId,
  "Usage: node scripts/verify-lung-sound-ai.mjs RECORDING_UUID [WEB_URL]",
);
const base = process.argv[3] || "http://localhost:3000";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const sql = postgres(process.env.DIRECT_DATABASE_URL, { prepare: false });
const email = `lung-ai-check-${randomUUID()}@example.com`;
const password = randomUUID() + randomUUID();
let userId;
try {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Temporary AI integration check" },
  });
  if (error) throw new Error(`Test user creation failed: ${error.code}`);
  userId = data.user.id;
  const cookies = new Map();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
        setAll: (items) =>
          items.forEach(({ name, value }) => cookies.set(name, value)),
      },
    },
  );
  const login = await auth.auth.signInWithPassword({ email, password });
  if (login.error) throw new Error(`Test login failed: ${login.error.code}`);
  const headers = {
    Cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "),
  };
  const path = `${base}/api/recordings/${recordingId}`;
  for (const [suffix, method] of [
    ["analyze", "POST"],
    ["analysis", "GET"],
  ]) {
    const unauthorized = await fetch(`${path}/${suffix}`, { method });
    assert.equal(unauthorized.status, 401);
  }
  const analyze = async () => {
    const response = await fetch(`${path}/analyze`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(180_000),
    });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.data.recording.analysis_status, "completed");
    return body.data;
  };
  const first = await analyze();
  assert(
    first.cycles.length > 0,
    "Live WAV produced no cycles; use a recording with respiratory cycles.",
  );
  const second = await analyze();
  assert.deepEqual(
    second.cycles.map((c) => c.id),
    first.cycles.map((c) => c.id),
    "Retry changed cycle IDs",
  );
  const rows =
    await sql`select id, cycle_index, ai_label, review_status from respiratory_cycles where recording_id = ${recordingId} order by cycle_index`;
  assert.equal(rows.length, first.cycles.length);
  assert.equal(new Set(rows.map((r) => r.cycle_index)).size, rows.length);
  const read = await fetch(`${path}/analysis`, { headers });
  assert.equal(read.status, 200);
  assert.equal((await read.json()).data.cycles.length, rows.length);
  console.log(
    JSON.stringify(
      {
        verified: true,
        recording_id: recordingId,
        persisted_cycles: rows.length,
        retry_ids_preserved: true,
        unauthorized_status: 401,
      },
      null,
      2,
    ),
  );
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error)
      console.error("Temporary test user cleanup failed:", userId, error.code);
  }
  await sql.end();
}
