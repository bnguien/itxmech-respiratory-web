import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DIRECT_DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DIRECT_DATABASE_URL chưa được cấu hình.");
}

const globalForDatabase = globalThis as unknown as {
  patientSql?: ReturnType<typeof postgres>;
};

const sql =
  globalForDatabase.patientSql ??
  postgres(databaseUrl, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDatabase.patientSql = sql;

export const db = drizzle(sql);
