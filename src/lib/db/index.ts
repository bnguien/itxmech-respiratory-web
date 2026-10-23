import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Server dùng Supabase transaction pooler (cổng 6543): nhiều tiến trình / máy chạy cùng lúc không vượt
// giới hạn 15 kết nối của session pooler (lỗi EMAXCONNSESSION). DIRECT_DATABASE_URL (cổng 5432) chỉ để
// drizzle-kit chạy migration; còn thiếu DATABASE_URL thì tạm dùng nó như trước.
const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL (hoặc DIRECT_DATABASE_URL) chưa được cấu hình.");
}

if (!process.env.DATABASE_URL && process.env.NODE_ENV !== "test") {
  console.warn("[db] Chưa có DATABASE_URL, đang dùng DIRECT_DATABASE_URL (session pooler, tối đa 15 kết nối).");
}

const globalForDatabase = globalThis as unknown as {
  patientSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDatabase.patientSql ??
  postgres(databaseUrl, {
    max: 5,
    prepare: false, // transaction pooler không giữ prepared statement giữa các request
    idle_timeout: 20,
    connect_timeout: 10,
  });

globalForDatabase.patientSql ??= sql;

export const db = drizzle(sql);
