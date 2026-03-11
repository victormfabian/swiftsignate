import "server-only";

import { createHash, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { sendCustomerEmail } from "@/lib/customer-email";
import { getPostgresPool, isSupabaseConfigured } from "@/lib/supabase-postgres";

export type PartnerStatus = "pending" | "approved";

type DatabaseUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  password_hash: string;
  status: PartnerStatus;
  approved_at: string | null;
  approval_email_sent_at: string | null;
  must_change_password: boolean | number;
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

type DatabasePasswordResetToken = {
  id: string;
  user_id: string;
  token_hash: string;
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
const PASSWORD_RESET_TTL_MS = 1000 * 60 * 30;

type SqliteDatabase = import("node:sqlite").DatabaseSync;

const require = createRequire(import.meta.url);

let sqliteDatabase: SqliteDatabase | null = null;
let postgresReady: Promise<void> | null = null;

function normalizeUser(row: DatabaseUser): DatabaseUser {
  return {
    ...row,
    must_change_password: Boolean(row.must_change_password)
  };
}

export type PartnerAccount = {
  id: string;
  businessName: string;
  email: string;
  phone: string;
  status: PartnerStatus;
  approvedAt: string | null;
  approvalEmailSentAt: string | null;
  mustChangePassword: boolean;
  createdAt: string;
};

function toPartnerAccount(user: DatabaseUser): PartnerAccount {
  const normalizedUser = normalizeUser(user);

  return {
    id: normalizedUser.id,
    businessName: normalizedUser.name,
    email: normalizedUser.email,
    phone: normalizedUser.phone,
    status: normalizedUser.status,
    approvedAt: normalizedUser.approved_at,
    approvalEmailSentAt: normalizedUser.approval_email_sent_at,
    mustChangePassword: Boolean(normalizedUser.must_change_password),
    createdAt: normalizedUser.created_at
  };
}

function formatTimestamp() {
  return new Date().toISOString();
}

function buildTemporaryPassword() {
  return `Swift${Math.floor(100000 + Math.random() * 900000)}!`;
}

function ensureSqliteColumn(db: SqliteDatabase, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;

  if (!columns.some((current) => current.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
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
      status TEXT NOT NULL DEFAULT 'approved',
      approved_at TEXT,
      approval_email_sent_at TEXT,
      must_change_password INTEGER NOT NULL DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  ensureSqliteColumn(sqliteDatabase, "users", "status", "TEXT NOT NULL DEFAULT 'approved'");
  ensureSqliteColumn(sqliteDatabase, "users", "approved_at", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "users", "approval_email_sent_at", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "users", "must_change_password", "INTEGER NOT NULL DEFAULT 0");

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
          status TEXT NOT NULL DEFAULT 'approved',
          approved_at TEXT,
          approval_email_sent_at TEXT,
          must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TEXT NOT NULL
        )
      `);
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT \'approved\'');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TEXT');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_email_sent_at TEXT');
      await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE');
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
      await pool.query(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
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
  const existingAdmin = await pool.query<{ id: string }>("SELECT id FROM admins WHERE LOWER(TRIM(email)) = $1 ORDER BY created_at ASC", [
    DEFAULT_ADMIN_EMAIL.toLowerCase()
  ]);

  if (existingAdmin.rows.length > 0) {
    if (existingAdmin.rows.length > 1) {
      await pool.query("DELETE FROM admins WHERE id = ANY($1::text[])", [existingAdmin.rows.slice(1).map((admin) => admin.id)]);
    }

    await pool.query("UPDATE admins SET name = $1, email = $2, password_hash = $3 WHERE id = $4", [
      "Swift Signate Admin",
      DEFAULT_ADMIN_EMAIL.toLowerCase(),
      hashPassword(DEFAULT_ADMIN_PASSWORD),
      existingAdmin.rows[0].id
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

async function getUserByEmailRecord(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseUser>("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
    return result.rows[0] ? normalizeUser(result.rows[0]) : null;
  }

  const db = getSqliteDatabase();
  const user = (db.prepare("SELECT * FROM users WHERE email = ? LIMIT 1").get(normalizedEmail) as DatabaseUser | undefined) ?? null;
  return user ? normalizeUser(user) : null;
}

async function getUserByIdRecord(userId: string) {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseUser>("SELECT * FROM users WHERE id = $1 LIMIT 1", [userId]);
    return result.rows[0] ? normalizeUser(result.rows[0]) : null;
  }

  const db = getSqliteDatabase();
  const user = (db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(userId) as DatabaseUser | undefined) ?? null;
  return user ? normalizeUser(user) : null;
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
      status: "approved",
      approved_at: formatTimestamp(),
      approval_email_sent_at: formatTimestamp(),
      must_change_password: false,
      created_at: formatTimestamp()
    };

    await pool.query(
      `INSERT INTO users (
        id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.password_hash,
      user.status,
      user.approved_at,
      user.approval_email_sent_at,
      false,
      user.created_at
      ]
    );

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
    status: "approved",
    approved_at: formatTimestamp(),
    approval_email_sent_at: formatTimestamp(),
    must_change_password: false,
    created_at: formatTimestamp()
  };

  db.prepare(
    `INSERT INTO users (
      id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    user.name,
    user.email,
    user.phone,
    user.password_hash,
    user.status,
    user.approved_at,
    user.approval_email_sent_at,
    0,
    user.created_at
  );

  return {
    ok: true as const,
    user
  };
}

export async function createPartnerApplication(input: { businessName: string; email: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const businessName = input.businessName.trim();

  const existingUser = await getUserByEmailRecord(normalizedEmail);

  if (existingUser) {
    return {
      ok: false as const,
      message:
        existingUser.status === "approved"
          ? "A partner account already exists with that email address."
          : "That business email is already waiting for admin approval."
    };
  }

  const user: DatabaseUser = {
    id: randomUUID(),
    name: businessName,
    email: normalizedEmail,
    phone: "",
    password_hash: hashPassword(randomUUID()),
    status: "pending",
    approved_at: null,
    approval_email_sent_at: null,
    must_change_password: false,
    created_at: formatTimestamp()
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO users (
        id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.password_hash,
        user.status,
        user.approved_at,
        user.approval_email_sent_at,
        false,
        user.created_at
      ]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `INSERT INTO users (
        id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      user.id,
      user.name,
      user.email,
      user.phone,
      user.password_hash,
      user.status,
      user.approved_at,
      user.approval_email_sent_at,
      0,
      user.created_at
    );
  }

  await sendCustomerEmail({
    to: user.email,
    subject: "Swift Signate partner registration received",
    text: [
      `Hello ${user.name},`,
      "",
      "Your partner access request has been received.",
      "A Swift Signate admin will review your business registration shortly.",
      "",
      "You will receive another email with your temporary password once your access is approved.",
      "",
      "Swift Signate"
    ].join("\n")
  });

  return {
    ok: true as const,
    partner: toPartnerAccount(user)
  };
}

export async function authenticateUser(input: { email: string; password: string }) {
  const user = await getUserByEmailRecord(input.email);

  if (!user) {
    return {
      ok: false as const,
      reason: "credentials" as const
    };
  }

  if (user.status !== "approved") {
    return {
      ok: false as const,
      reason: "pending" as const
    };
  }

  if (!verifyPassword(input.password, user.password_hash)) {
    return {
      ok: false as const,
      reason: "credentials" as const
    };
  }

  return {
    ok: true as const,
    user
  };
}

export async function findOrCreateGoogleUser(input: { email: string; name: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const existingUser = await getUserByEmailRecord(normalizedEmail);

  if (existingUser) {
    return existingUser;
  }

  const user: DatabaseUser = {
    id: randomUUID(),
    name: input.name.trim() || normalizedEmail.split("@")[0] || "Google User",
    email: normalizedEmail,
    phone: "",
    password_hash: hashPassword(randomUUID()),
    status: "approved",
    approved_at: formatTimestamp(),
    approval_email_sent_at: formatTimestamp(),
    must_change_password: false,
    created_at: formatTimestamp()
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO users (
        id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.password_hash,
        user.status,
        user.approved_at,
        user.approval_email_sent_at,
        false,
        user.created_at
      ]
    );
    return user;
  }

  const db = getSqliteDatabase();
  db.prepare(
    `INSERT INTO users (
      id, name, email, phone, password_hash, status, approved_at, approval_email_sent_at, must_change_password, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    user.name,
    user.email,
    user.phone,
    user.password_hash,
    user.status,
    user.approved_at,
    user.approval_email_sent_at,
    0,
    user.created_at
  );

  return user;
}

export async function createPasswordResetToken(email: string) {
  const user = await getUserByEmailRecord(email);

  if (!user) {
    return null;
  }

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const tokenRecord: DatabasePasswordResetToken = {
    id: randomUUID(),
    user_id: user.id,
    token_hash: hashToken(token),
    expires_at: Date.now() + PASSWORD_RESET_TTL_MS,
    created_at: formatTimestamp()
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1 OR expires_at <= $2", [user.id, Date.now()]);
    await pool.query(
      "INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)",
      [tokenRecord.id, tokenRecord.user_id, tokenRecord.token_hash, tokenRecord.expires_at, tokenRecord.created_at]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ? OR expires_at <= ?").run(user.id, Date.now());
    db.prepare("INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)").run(
      tokenRecord.id,
      tokenRecord.user_id,
      tokenRecord.token_hash,
      tokenRecord.expires_at,
      tokenRecord.created_at
    );
  }

  return {
    token,
    user
  };
}

export async function resetUserPasswordWithToken(token: string, nextPassword: string) {
  const tokenHash = hashToken(token.trim());

  if (!tokenHash) {
    return null;
  }

  let resetToken: DatabasePasswordResetToken | null = null;

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("DELETE FROM password_reset_tokens WHERE expires_at <= $1", [Date.now()]);
    const tokenResult = await pool.query<DatabasePasswordResetToken>(
      "SELECT * FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1",
      [tokenHash]
    );
    resetToken = tokenResult.rows[0] ?? null;

    if (!resetToken) {
      return null;
    }

    const passwordHash = hashPassword(nextPassword);
    await pool.query("UPDATE users SET password_hash = $1, must_change_password = $2 WHERE id = $3", [passwordHash, false, resetToken.user_id]);
    await pool.query("DELETE FROM password_reset_tokens WHERE user_id = $1", [resetToken.user_id]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("DELETE FROM password_reset_tokens WHERE expires_at <= ?").run(Date.now());
    resetToken = (db.prepare("SELECT * FROM password_reset_tokens WHERE token_hash = ? LIMIT 1").get(tokenHash) as
      | DatabasePasswordResetToken
      | undefined) ?? null;

    if (!resetToken) {
      return null;
    }

    const passwordHash = hashPassword(nextPassword);
    db.prepare("UPDATE users SET password_hash = ?, must_change_password = ? WHERE id = ?").run(passwordHash, 0, resetToken.user_id);
    db.prepare("DELETE FROM password_reset_tokens WHERE user_id = ?").run(resetToken.user_id);
  }

  return getUserByIdRecord(resetToken.user_id);
}

export async function authenticateAdmin(input: { email: string; password: string }) {
  const normalizedEmail = input.email.trim().toLowerCase();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseAdmin>(
      "SELECT * FROM admins WHERE LOWER(TRIM(email)) = $1 ORDER BY created_at ASC LIMIT 1",
      [normalizedEmail]
    );
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
      const user = userResult.rows[0] ? normalizeUser(userResult.rows[0]) : null;

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
      user: normalizeUser(user)
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

export async function listPartnerAccounts() {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<DatabaseUser>(
      "SELECT * FROM users ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC"
    );
    return result.rows.map((row) => toPartnerAccount(row));
  }

  const db = getSqliteDatabase();
  const users = db.prepare("SELECT * FROM users ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END, created_at DESC").all() as DatabaseUser[];
  return users.map((user) => toPartnerAccount(user));
}

export async function approvePartnerAccount(partnerId: string) {
  const user = await getUserByIdRecord(partnerId);

  if (!user) {
    return null;
  }

  const temporaryPassword = buildTemporaryPassword();
  const approvedAt = formatTimestamp();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE users
       SET status = $1,
           password_hash = $2,
           approved_at = $3,
           approval_email_sent_at = $4,
           must_change_password = $5
       WHERE id = $6`,
      ["approved", hashPassword(temporaryPassword), approvedAt, approvedAt, true, user.id]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `UPDATE users
       SET status = ?, password_hash = ?, approved_at = ?, approval_email_sent_at = ?, must_change_password = ?
       WHERE id = ?`
    ).run("approved", hashPassword(temporaryPassword), approvedAt, approvedAt, 1, user.id);
  }

  const approvedUser = await getUserByIdRecord(user.id);

  if (!approvedUser) {
    return null;
  }

  await sendCustomerEmail({
    to: approvedUser.email,
    subject: "Swift Signate partner access approved",
    text: [
      `Hello ${approvedUser.name},`,
      "",
      "Your Swift Signate partner access has been approved.",
      `Temporary password: ${temporaryPassword}`,
      "",
      "Sign in with your business email and this temporary password.",
      "You will be asked to set your own password and complete your profile after sign in.",
      "",
      "Swift Signate"
    ].join("\n")
  });

  return {
    partner: toPartnerAccount(approvedUser),
    temporaryPassword
  };
}

export async function completePartnerProfile(
  userId: string,
  input: {
    phone: string;
    password: string;
  }
) {
  const user = await getUserByIdRecord(userId);

  if (!user || user.status !== "approved") {
    return null;
  }

  const passwordHash = hashPassword(input.password);
  const phone = input.phone.trim();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("UPDATE users SET phone = $1, password_hash = $2, must_change_password = $3 WHERE id = $4", [
      phone,
      passwordHash,
      false,
      userId
    ]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE users SET phone = ?, password_hash = ?, must_change_password = ? WHERE id = ?").run(
      phone,
      passwordHash,
      0,
      userId
    );
  }

  const nextUser = await getUserByIdRecord(userId);
  return nextUser ? toPartnerAccount(nextUser) : null;
}
