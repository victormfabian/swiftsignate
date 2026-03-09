import "server-only";

import { createHash, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getPostgresPool, isSupabaseConfigured } from "@/lib/supabase-postgres";

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  created_at: string;
};

type DatabaseAdmin = {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
};

type DatabaseSession = {
  id: string;
  token_hash: string;
  role: "user" | "admin";
  account_id: string;
  expires_at: number;
  created_at: string;
};

type DatabaseSessionResult =
  | {
      role: "user";
      session: DatabaseSession;
      user: DatabaseUser;
    }
  | {
      role: "admin";
      session: DatabaseSession;
      admin: DatabaseAdmin;
    }
  | null;

const DB_PATH = join(process.cwd(), "data", "swift-signate-auth.db");
const DEFAULT_ADMIN_EMAIL = "admin@swiftsignate.com";
const DEFAULT_ADMIN_PASSWORD = "Superswift@vakes.26";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ADMIN_SESSION_TTL_MS = 1000 * 60 * 60 * 12;

type SqliteDatabase = import("node:sqlite").DatabaseSync;

const require = createRequire(import.meta.url);

let sqliteDatabase: SqliteDatabase | null = null;
let postgresReady: Promise<void> | null = null;

function formatTimestamp() {
  return new Date().toISOString();
}

function getSqliteDatabase() {
  if (sqliteDatabase) {
    return sqliteDatabase;
  }

  mkdirSync(dirname(DB_PATH), { recursive: true });
  const { DatabaseSync } = require("node:sqlite") as typeof import("node:sqlite");
  sqliteDatabase = new DatabaseSync(DB_PATH);
  sqliteDatabase.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      token_hash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      account_id TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  seedDefaultAdminSqlite(sqliteDatabase);

  return sqliteDatabase;
}

async function ensurePostgresSchema() {
  if (!isSupabaseConfigured()) {
    return;
  }

  if (!postgresReady) {
    postgresReady = (async () => {
      const pool = getPostgresPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          phone TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admins (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          token_hash TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL,
          account_id TEXT NOT NULL,
          expires_at BIGINT NOT NULL,
          created_at TEXT NOT NULL
        )
      `);
      await seedDefaultAdminPostgres();
    })();
  }

  await postgresReady;
}

function seedDefaultAdminSqlite(db: SqliteDatabase) {
  const existingAdmin = db
    .prepare("SELECT id FROM admins WHERE email = ? LIMIT 1")
    .get(DEFAULT_ADMIN_EMAIL.toLowerCase()) as { id: string } | undefined;

  if (existingAdmin) {
    db.prepare("UPDATE admins SET name = ?, password_hash = ? WHERE id = ?").run(
      "Swift Signate Admin",
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      existingAdmin.id
    );
    return;
  }

  db.prepare("INSERT INTO admins (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(),
    "Swift Signate Admin",
    DEFAULT_ADMIN_EMAIL.toLowerCase(),
    hashPassword(DEFAULT_ADMIN_PASSWORD),
    formatTimestamp()
  );
}

async function seedDefaultAdminPostgres() {
  const pool = getPostgresPool();
  const existingAdmin = await pool.query<{ id: string }>("SELECT id FROM admins WHERE email = $1 LIMIT 1", [
    DEFAULT_ADMIN_EMAIL.toLowerCase()
  ]);

  if (existingAdmin.rows.length > 0) {
    await pool.query("UPDATE admins SET name = $1, password_hash = $2 WHERE email = $3", [
      "Swift Signate Admin",
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      DEFAULT_ADMIN_EMAIL.toLowerCase()
    ]);
    return;
  }

  await pool.query("INSERT INTO admins (id, name, email, password_hash, created_at) VALUES ($1, $2, $3, $4, $5)", [
    randomUUID(),
    "Swift Signate Admin",
    DEFAULT_ADMIN_EMAIL.toLowerCase(),
    hashPassword(DEFAULT_ADMIN_PASSWORD),
    formatTimestamp()
  ]);
}

export function hashPassword(password: string) {
  const salt = randomUUID().replace(/-/g, "");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) {
    return false;
  }

  const derivedHash = scryptSync(password, salt, 64);
  const original = Buffer.from(originalHash, "hex");
  return derivedHash.length === original.length && timingSafeEqual(derivedHash, original);
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createUser(input: { name: string; email: string; phone: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const existingUser = await pool.query<{ id: string }>("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);

    if (existingUser.rows.length > 0) {
      return {
        ok: false as const,
        message: "An account already exists with that email address."
      };
    }

    const user: DatabaseUser = {
      id: randomUUID(),
      name: input.name.trim(),
      email: normalizedEmail,
      phone: input.phone.trim(),
      password_hash: hashPassword(input.password),
      created_at: formatTimestamp()
    };

    await pool.query("INSERT INTO users (id, name, email, phone, password_hash, created_at) VALUES ($1, $2, $3, $4, $5, $6)", [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.password_hash,
      user.created_at
    ]);

    return {
      ok: true as const,
      user
    };
  }

  const db = getSqliteDatabase();
  const existingUser = db.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").get(normalizedEmail) as
    | { id: string }
    | undefined;

  if (existingUser) {
    return {
      ok: false as const,
      message: "An account already exists with that email address."
    };
  }

  const user: DatabaseUser = {
    id: randomUUID(),
    name: input.name.trim(),
    email: normalizedEmail,
    phone: input.phone.trim(),
    password_hash: hashPassword(input.password),
    created_at: formatTimestamp()
  };

  db.prepare("INSERT INTO users (id, name, email, phone, password_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
    user.id,
    user.name,
    user.email,
    user.phone,
    user.password_hash,
    user.created_at
  );

  return {
    ok: true as const,
    user
  };
}

export async function authenticateUser(input: { email: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseUser>("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
    const user = result.rows[0];

    if (!user || !verifyPassword(input.password, user.password_hash)) {
      return null;
    }

    return user;
  }

  const db = getSqliteDatabase();
  const user = db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(normalizedEmail) as DatabaseUser | undefined;

  if (!user || !verifyPassword(input.password, user.password_hash)) {
    return null;
  }

  return user;
}

export async function authenticateAdmin(input: { email: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseAdmin>("SELECT * FROM admins WHERE email = $1 LIMIT 1", [normalizedEmail]);
    const admin = result.rows[0];

    if (!admin || !verifyPassword(input.password, admin.password_hash)) {
      return null;
    }

    return admin;
  }

  const db = getSqliteDatabase();
  const admin = db.prepare("SELECT * FROM admins WHERE email = ? LIMIT 1").get(normalizedEmail) as
    | DatabaseAdmin
    | undefined;

  if (!admin || !verifyPassword(input.password, admin.password_hash)) {
    return null;
  }

  return admin;
}

export async function createSession(role: "user" | "admin", accountId: string) {
  const session: DatabaseSession = {
    id: randomUUID(),
    token_hash: "",
    role,
    account_id: accountId,
    expires_at: Date.now() + (role === "admin" ? ADMIN_SESSION_TTL_MS : SESSION_TTL_MS),
    created_at: formatTimestamp()
  };
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  session.token_hash = hashToken(token);

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      "INSERT INTO sessions (id, token_hash, role, account_id, expires_at, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
      [session.id, session.token_hash, session.role, session.account_id, session.expires_at, session.created_at]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare("INSERT INTO sessions (id, token_hash, role, account_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      session.id,
      session.token_hash,
      session.role,
      session.account_id,
      session.expires_at,
      session.created_at
    );
  }

  return {
    token,
    expiresAt: session.expires_at
  };
}

export async function deleteSession(token: string) {
  const tokenHash = hashToken(token);

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
    return;
  }

  const db = getSqliteDatabase();
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

export async function getSessionByToken(token: string): Promise<DatabaseSessionResult> {
  const tokenHash = hashToken(token);

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("DELETE FROM sessions WHERE expires_at <= $1", [Date.now()]);
    const sessionResult = await pool.query<DatabaseSession>("SELECT * FROM sessions WHERE token_hash = $1 LIMIT 1", [tokenHash]);
    const session = sessionResult.rows[0];

    if (!session) {
      return null;
    }

    if (session.role === "user") {
      const userResult = await pool.query<DatabaseUser>("SELECT * FROM users WHERE id = $1 LIMIT 1", [session.account_id]);
      const user = userResult.rows[0];

      if (!user) {
        return null;
      }

      return {
        role: "user",
        session,
        user
      };
    }

    const adminResult = await pool.query<DatabaseAdmin>("SELECT * FROM admins WHERE id = $1 LIMIT 1", [session.account_id]);
    const admin = adminResult.rows[0];

    if (!admin) {
      return null;
    }

    return {
      role: "admin",
      session,
      admin
    };
  }

  const db = getSqliteDatabase();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());

  const session = db.prepare("SELECT * FROM sessions WHERE token_hash = ? LIMIT 1").get(tokenHash) as
    | DatabaseSession
    | undefined;

  if (!session) {
    return null;
  }

  if (session.role === "user") {
    const user = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(session.account_id) as
      | DatabaseUser
      | undefined;

    if (!user) {
      return null;
    }

    return {
      role: "user",
      session,
      user
    };
  }

  const admin = db.prepare("SELECT * FROM admins WHERE id = ? LIMIT 1").get(session.account_id) as
    | DatabaseAdmin
    | undefined;

  if (!admin) {
    return null;
  }

  return {
    role: "admin",
    session,
    admin
  };
}

export function getDefaultAdminEmail() {
  return DEFAULT_ADMIN_EMAIL;
}
