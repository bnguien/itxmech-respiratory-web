import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Runtime ưu tiên transaction pooler (6543); session pooler (5432) dành cho migration.
// Nếu chưa cấu hình DATABASE_URL, giới hạn fallback ở một kết nối mỗi tiến trình.
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL (hoặc DIRECT_DATABASE_URL) chưa được cấu hình.");
}

const globalForDatabase = globalThis as unknown as {
  patientSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDatabase.patientSql ??
  postgres(databaseUrl, {
    max: process.env.DATABASE_URL ? 5 : 1,
    prepare: false, // tương thích cả session pooler và transaction pooler
    idle_timeout: 20,
    connect_timeout: 10,
  });

globalForDatabase.patientSql ??= sql;

export const db = drizzle(sql);
