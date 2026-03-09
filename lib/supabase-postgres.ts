import "server-only";

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getConnectionString() {
  const rawValue = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";

  return rawValue
    .trim()
    .replace(/^SUPABASE_DB_URL=/i, "")
    .replace(/^DATABASE_URL=/i, "")
    .replace(/^['"]/, "")
    .replace(/['"]$/, "");
}

export function isSupabaseConfigured() {
  const connectionString = getConnectionString();
  return /^postgres(ql)?:\/\//i.test(connectionString);
}

export function getPostgresPool() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase Postgres is not configured.");
  }

  if (pool) {
    return pool;
  }

  const connectionString = getConnectionString();
  const isLocalConnection = /localhost|127\.0\.0\.1/i.test(connectionString);

  pool = new Pool({
    connectionString,
    max: process.env.VERCEL ? 3 : 10,
    ssl: isLocalConnection
      ? undefined
      : {
          rejectUnauthorized: false
        }
  });

  return pool;
}

export async function queryPostgres<T extends QueryResultRow>(text: string, values: unknown[] = []) {
  const database = getPostgresPool();
  return database.query<T>(text, values);
}
