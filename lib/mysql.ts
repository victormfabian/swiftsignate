import "server-only";

import mysql, { type Pool } from "mysql2/promise";

let pool: Pool | null = null;

export function isMySqlConfigured() {
  return Boolean(process.env.DATABASE_URL || process.env.MYSQL_HOST);
}

function getConnectionConfig() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  return {
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD
  };
}

export function getMySqlPool() {
  if (!isMySqlConfigured()) {
    throw new Error("MySQL is not configured.");
  }

  if (pool) {
    return pool;
  }

  const config = getConnectionConfig();

  pool =
    typeof config === "string"
      ? mysql.createPool(config)
      : mysql.createPool({
          ...config,
          connectionLimit: 10
        });

  return pool;
}
