import "server-only";

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { listPartnerAccounts } from "@/lib/auth-db";
import { getPostgresPool, isSupabaseConfigured } from "@/lib/supabase-postgres";
import {
  type BookingInput,
  type BookingRecordDetails,
  buildLastUpdate,
  type ContactRequest,
  type ContactRequestInput,
  type CustomerUpdate,
  formatAirWaybill,
  formatCreatedAt,
  formatDeliveredAt,
  formatInvoiceNumber,
  formatPaymentRequestId,
  formatTrackingNumber,
  normalizeTrackingNumber,
  parseTrackingSequence,
  type PaymentRequest,
  type ShipmentPartyDetails,
  previewTrackingNumber,
  seedShipments,
  type Shipment,
  type ShipmentStoreState,
  type TransferRequestInput
} from "@/lib/shipment-model";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content-model";
import { sendCustomerEmail } from "@/lib/customer-email";
import { getSiteUrl } from "@/lib/site-url";

const DB_PATH = join(process.cwd(), "data", "swift-signate-operations.db");

type SqliteDatabase = import("node:sqlite").DatabaseSync;

const require = createRequire(import.meta.url);

let sqliteDatabase: SqliteDatabase | null = null;
let postgresReady: Promise<void> | null = null;

type PaymentRequestRow = Omit<PaymentRequest, "shipmentRef" | "airWaybill" | "details" | "amount"> & {
  shipmentRef: string | null;
  airWaybill: string | null;
  details: string | null;
  amount: number | string;
  bankName: string | null;
  accountNumber: string | null;
  accountName: string | null;
  quoteSentAt: string | null;
  invoiceNumber: string | null;
  invoiceIssuedAt: string | null;
};

type CustomerUpdateRow = Omit<CustomerUpdate, "read"> & {
  read: boolean | number;
};

type ShipmentRow = Omit<Shipment, "details"> & {
  details: string | null;
  clearanceFee: number | string | null;
};

type ContactRequestRow = Omit<ContactRequest, "read"> & {
  read: boolean | number;
};

function serializeDetails(details: BookingRecordDetails | null | undefined) {
  return details ? JSON.stringify(details) : null;
}

function parseDetails(details: string | null | undefined) {
  if (!details) {
    return null;
  }

  try {
    return JSON.parse(details) as BookingRecordDetails;
  } catch {
    return null;
  }
}

function emptyPartyDetails(): ShipmentPartyDetails {
  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    postalCode: "",
    residential: false
  };
}

function buildFallbackRequestDetails(request: PaymentRequest): BookingRecordDetails {
  return {
    shipperType: "business",
    route: {
      fromCountry: "",
      fromCity: request.origin,
      toCountry: "",
      toCity: request.destination,
      shipmentDate: "",
      residential: null
    },
    shipment: {
      packagingType: request.packageType,
      higherLiability: null,
      weightUnit: "kg",
      dimensionUnit: "cm",
      packages: []
    },
    sender: emptyPartyDetails(),
    receiver: emptyPartyDetails(),
    quoteSort: "fastest",
    selectedQuote: request.serviceTitle
      ? {
          id: "custom-service",
          title: request.serviceTitle,
          etaHeadline: request.eta,
          etaDetail: "",
          pickupNote: "",
          operator: "",
          price: request.amount
        }
      : null,
    payment: {
      method: "Direct transfer",
      note: request.note
    }
  };
}

function hasPartyContactDetails(details: ShipmentPartyDetails | undefined, options?: { requirePostalCode?: boolean }) {
  if (!details) {
    return false;
  }

  const requiredFields = [details.name, details.email, details.phone, details.address1, details.city];

  if (options?.requirePostalCode) {
    requiredFields.push(details.postalCode);
  }

  return requiredFields.every((value) => value.trim());
}

function hasStoredRequestContacts(details: BookingRecordDetails | null | undefined) {
  if (!details) {
    return false;
  }

  return hasPartyContactDetails(details.sender) && hasPartyContactDetails(details.receiver, { requirePostalCode: true });
}

function mapShipment(row: ShipmentRow): Shipment {
  return {
    ...row,
    clearanceFee: row.clearanceFee === null || row.clearanceFee === undefined ? undefined : Number(row.clearanceFee),
    details: parseDetails(row.details)
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatMoney(value: number, options?: { omitFractionIfWhole?: boolean }) {
  const hasFraction = Math.abs(value % 1) > 0.0001;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: options?.omitFractionIfWhole && !hasFraction ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

function buildCustomerEmailHtml(input: {
  title: string;
  message: string;
  details?: string[];
  actionLabel?: string;
  actionHref?: string;
}) {
  const detailsMarkup =
    input.details && input.details.length > 0
      ? `<div style="margin-top:24px;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px;">${input.details
          .map(
            (detail) =>
              `<div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;">${escapeHtml(detail)}</div>`
          )
          .join("")}</div>`
      : "";
  const actionMarkup =
    input.actionLabel && input.actionHref
      ? `<div style="margin-top:28px;"><a href="${escapeHtml(input.actionHref)}" style="display:inline-block;border-radius:999px;background:#2563eb;color:#fff;padding:14px 22px;text-decoration:none;font-weight:600;font-size:15px;">${escapeHtml(input.actionLabel)}</a></div>`
      : "";

  return `
    <div style="margin:0;padding:32px 16px;background:#0f1720;font-family:Segoe UI,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid rgba(251,146,60,0.28);background:#111827;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#132238 0%,#0f1720 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:24px;font-weight:700;letter-spacing:0.02em;color:#f8fafc;">Swift Signate</div>
        </div>
        <div style="padding:32px;">
          <div style="color:#f8fafc;font-size:32px;font-weight:700;line-height:1.2;">${escapeHtml(input.title)}</div>
          <div style="margin-top:18px;color:#d1d5db;font-size:16px;line-height:1.8;">${escapeHtml(input.message)}</div>
          ${detailsMarkup}
          ${actionMarkup}
        </div>
      </div>
    </div>
  `;
}

function buildShipmentUpdateEmailHtml(shipment: Shipment, title: string) {
  const trackingUrl = `${getSiteUrl()}/dashboard/track?ref=${encodeURIComponent(shipment.ref)}`;
  const clearanceBlock =
    typeof shipment.clearanceFee === "number"
      ? `<div style="margin-top:22px;color:#d1d5db;font-size:16px;line-height:1.8;">
          Your clearance fee is <strong style="color:#f8fafc;">${escapeHtml(formatMoney(shipment.clearanceFee))}</strong>.
          This amount was updated by the Swift Signate admin for this shipment.
        </div>`
      : "";

  return `
    <div style="margin:0;padding:32px 16px;background:#0f1720;font-family:Segoe UI,Arial,sans-serif;">
      <div style="max-width:620px;margin:0 auto;overflow:hidden;border-radius:28px;border:1px solid rgba(251,146,60,0.28);background:#111827;">
        <div style="padding:28px 32px;background:linear-gradient(135deg,#132238 0%,#0f1720 100%);border-bottom:1px solid rgba(255,255,255,0.06);">
          <div style="font-size:24px;font-weight:700;letter-spacing:0.02em;color:#f8fafc;">Swift Signate</div>
        </div>
        <div style="padding:32px;">
          <div style="color:#f8fafc;font-size:30px;font-weight:700;line-height:1.2;">${escapeHtml(title)}</div>
          <div style="margin-top:24px;color:#d1d5db;font-size:16px;line-height:1.8;">
            Dear ${escapeHtml(shipment.customer || "Customer")},
          </div>
          <div style="margin-top:18px;color:#d1d5db;font-size:16px;line-height:1.8;">
            ${escapeHtml(shipment.lastUpdate)}
          </div>
          <div style="margin-top:28px;border-top:1px solid rgba(255,255,255,0.08);padding-top:22px;">
            <div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Tracking number:</strong> ${escapeHtml(shipment.ref)}</div>
            <div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Air waybill:</strong> ${escapeHtml(shipment.airWaybill)}</div>
            <div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Route:</strong> ${escapeHtml(`${shipment.origin} to ${shipment.destination}`)}</div>
            <div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Item status summary:</strong> ${escapeHtml(shipment.status)}</div>
            <div style="margin:0 0 10px;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Package details:</strong> ${escapeHtml(shipment.packageType)}</div>
            <div style="margin:0;color:#e5e7eb;font-size:15px;line-height:1.7;"><strong style="color:#f8fafc;">Delivery timeline:</strong> ${escapeHtml(shipment.eta)}</div>
          </div>
          <div style="margin-top:28px;">
            <a href="${escapeHtml(trackingUrl)}" style="display:inline-block;border-radius:999px;background:#2563eb;color:#fff;padding:14px 22px;text-decoration:none;font-weight:600;font-size:15px;">Track your shipment here</a>
          </div>
          ${clearanceBlock}
        </div>
      </div>
    </div>
  `;
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
    CREATE TABLE IF NOT EXISTS shipments (
      ref TEXT PRIMARY KEY,
      airWaybill TEXT NOT NULL,
      customer TEXT NOT NULL,
      customerEmail TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      eta TEXT NOT NULL,
      status TEXT NOT NULL,
      packageType TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      clearanceFee REAL,
      lastUpdate TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS payment_requests (
      id TEXT PRIMARY KEY,
      customer TEXT NOT NULL,
      customerEmail TEXT NOT NULL,
      customerPhone TEXT NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      eta TEXT NOT NULL,
      packageType TEXT NOT NULL,
      paymentMethod TEXT NOT NULL,
      serviceTitle TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      note TEXT NOT NULL,
      bankName TEXT,
      accountNumber TEXT,
      accountName TEXT,
      quoteSentAt TEXT,
      invoiceNumber TEXT,
      invoiceIssuedAt TEXT,
      paymentProofName TEXT NOT NULL,
      paymentProofType TEXT NOT NULL,
      paymentProofDataUrl TEXT NOT NULL,
      shipmentRef TEXT,
      airWaybill TEXT,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS customer_updates (
      id TEXT PRIMARY KEY,
      customerEmail TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS site_content (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contact_requests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      message TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0
    );
  `);

  ensureSqliteColumn(sqliteDatabase, "shipments", "details", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "shipments", "clearanceFee", "REAL");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "details", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "bankName", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "accountNumber", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "accountName", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "quoteSentAt", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "invoiceNumber", "TEXT");
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "invoiceIssuedAt", "TEXT");

  seedSqliteDatabase(sqliteDatabase);

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
        CREATE TABLE IF NOT EXISTS shipments (
          ref TEXT PRIMARY KEY,
          "airWaybill" TEXT NOT NULL,
          customer TEXT NOT NULL,
          "customerEmail" TEXT NOT NULL,
          "customerPhone" TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          eta TEXT NOT NULL,
          status TEXT NOT NULL,
          "packageType" TEXT NOT NULL,
          "paymentMethod" TEXT NOT NULL,
          "clearanceFee" NUMERIC(14, 2),
          "lastUpdate" TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          details TEXT
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_requests (
          id TEXT PRIMARY KEY,
          customer TEXT NOT NULL,
          "customerEmail" TEXT NOT NULL,
          "customerPhone" TEXT NOT NULL,
          origin TEXT NOT NULL,
          destination TEXT NOT NULL,
          eta TEXT NOT NULL,
          "packageType" TEXT NOT NULL,
          "paymentMethod" TEXT NOT NULL,
          "serviceTitle" TEXT NOT NULL,
          amount NUMERIC(14, 2) NOT NULL,
          status TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          note TEXT NOT NULL,
          "bankName" TEXT,
          "accountNumber" TEXT,
          "accountName" TEXT,
          "quoteSentAt" TEXT,
          "invoiceNumber" TEXT,
          "invoiceIssuedAt" TEXT,
          "paymentProofName" TEXT NOT NULL,
          "paymentProofType" TEXT NOT NULL,
          "paymentProofDataUrl" TEXT NOT NULL,
          "shipmentRef" TEXT,
          "airWaybill" TEXT,
          details TEXT
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_updates (
          id TEXT PRIMARY KEY,
          "customerEmail" TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT FALSE
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_content (
          id TEXT PRIMARY KEY,
          payload TEXT NOT NULL,
          "updatedAt" TEXT NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_requests (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          phone TEXT NOT NULL,
          message TEXT NOT NULL,
          "createdAt" TEXT NOT NULL,
          "read" BOOLEAN NOT NULL DEFAULT FALSE
        )
      `);
      await pool.query('ALTER TABLE shipments ADD COLUMN IF NOT EXISTS details TEXT');
      await pool.query('ALTER TABLE shipments ADD COLUMN IF NOT EXISTS "clearanceFee" NUMERIC(14, 2)');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS details TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "bankName" TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "accountNumber" TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "accountName" TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "quoteSentAt" TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT');
      await pool.query('ALTER TABLE payment_requests ADD COLUMN IF NOT EXISTS "invoiceIssuedAt" TEXT');
      await seedPostgresDatabase();
    })();
  }

  await postgresReady;
}

function seedSqliteDatabase(db: SqliteDatabase) {
  const shipmentCount = db.prepare("SELECT COUNT(*) as count FROM shipments").get() as { count: number };
  if (shipmentCount.count === 0) {
    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        ref, airWaybill, customer, customerEmail, customerPhone, origin, destination, eta,
        status, packageType, paymentMethod, clearanceFee, lastUpdate, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const shipment of seedShipments) {
      insertShipment.run(
        shipment.ref,
        shipment.airWaybill,
        shipment.customer,
        shipment.customerEmail,
        shipment.customerPhone,
        shipment.origin,
        shipment.destination,
        shipment.eta,
        shipment.status,
        shipment.packageType,
        shipment.paymentMethod,
        shipment.clearanceFee ?? null,
        shipment.lastUpdate,
        shipment.createdAt
      );
    }
  }

  const siteContentRow = db.prepare("SELECT id FROM site_content WHERE id = 'default' LIMIT 1").get() as
    | { id: string }
    | undefined;

  if (!siteContentRow) {
    db.prepare("INSERT INTO site_content (id, payload, updatedAt) VALUES (?, ?, ?)").run(
      "default",
      JSON.stringify(defaultSiteContent),
      new Date().toISOString()
    );
  }
}

async function seedPostgresDatabase() {
  const pool = getPostgresPool();
  const shipmentCountResult = await pool.query<{ count: string }>("SELECT COUNT(*) as count FROM shipments");

  if (Number(shipmentCountResult.rows[0]?.count ?? 0) === 0) {
    for (const shipment of seedShipments) {
      await pool.query(
        `INSERT INTO shipments (
          ref, "airWaybill", customer, "customerEmail", "customerPhone", origin, destination, eta,
          status, "packageType", "paymentMethod", "clearanceFee", "lastUpdate", "createdAt"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          shipment.ref,
          shipment.airWaybill,
          shipment.customer,
          shipment.customerEmail,
          shipment.customerPhone,
          shipment.origin,
          shipment.destination,
          shipment.eta,
          shipment.status,
          shipment.packageType,
          shipment.paymentMethod,
          shipment.clearanceFee ?? null,
          shipment.lastUpdate,
          shipment.createdAt
        ]
      );
    }
  }

  const contentResult = await pool.query<{ id: string }>('SELECT id FROM site_content WHERE id = $1 LIMIT 1', ["default"]);

  if (contentResult.rows.length === 0) {
    await pool.query('INSERT INTO site_content (id, payload, "updatedAt") VALUES ($1, $2, $3)', [
      "default",
      JSON.stringify(defaultSiteContent),
      new Date().toISOString()
    ]);
  }
}

function mapPaymentRequest(row: PaymentRequestRow): PaymentRequest {
  return {
    ...row,
    amount: Number(row.amount),
    bankName: row.bankName ?? "",
    accountNumber: row.accountNumber ?? "",
    accountName: row.accountName ?? "",
    quoteSentAt: row.quoteSentAt ?? undefined,
    invoiceNumber: row.invoiceNumber ?? undefined,
    invoiceIssuedAt: row.invoiceIssuedAt ?? undefined,
    shipmentRef: row.shipmentRef ?? undefined,
    airWaybill: row.airWaybill ?? undefined,
    details: parseDetails(row.details)
  };
}

function mapCustomerUpdate(row: CustomerUpdateRow): CustomerUpdate {
  return {
    ...row,
    read: Boolean(row.read)
  };
}

function mapContactRequest(row: ContactRequestRow): ContactRequest {
  return {
    ...row,
    read: Boolean(row.read)
  };
}

async function listShipments(): Promise<Shipment[]> {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<ShipmentRow>('SELECT * FROM shipments ORDER BY ref DESC');
    return result.rows.map(mapShipment);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM shipments ORDER BY ref DESC").all() as ShipmentRow[]).map(mapShipment);
}

async function listPaymentRequests(): Promise<PaymentRequest[]> {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<PaymentRequestRow>('SELECT * FROM payment_requests ORDER BY id DESC');
    return result.rows.map(mapPaymentRequest);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM payment_requests ORDER BY id DESC").all() as PaymentRequestRow[]).map(mapPaymentRequest);
}

async function listCustomerUpdates(): Promise<CustomerUpdate[]> {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<CustomerUpdateRow>('SELECT * FROM customer_updates ORDER BY id DESC');
    return result.rows.map(mapCustomerUpdate);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM customer_updates ORDER BY id DESC").all() as CustomerUpdateRow[]).map(mapCustomerUpdate);
}

async function listContactRequests(): Promise<ContactRequest[]> {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<ContactRequestRow>('SELECT * FROM contact_requests ORDER BY "createdAt" DESC, id DESC');
    return result.rows.map(mapContactRequest);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM contact_requests ORDER BY createdAt DESC, id DESC").all() as ContactRequestRow[]).map(
    mapContactRequest
  );
}

async function nextShipmentSequence() {
  const shipments = await listShipments();
  return Math.max(...shipments.map((shipment) => parseTrackingSequence(shipment.ref)), 100000) + 1;
}

async function nextPaymentRequestSequence() {
  const requests = await listPaymentRequests();
  return Math.max(...requests.map((request) => Number(request.id.split("-").pop() ?? 0)), 0) + 1;
}

async function nextCustomerUpdateSequence() {
  const updates = await listCustomerUpdates();
  return Math.max(...updates.map((update) => Number(update.id.split("-").pop() ?? 0)), 0) + 1;
}

async function nextContactRequestSequence() {
  const requests = await listContactRequests();
  return Math.max(...requests.map((request) => Number(request.id.split("-").pop() ?? 0)), 0) + 1;
}

async function insertCustomerUpdate(input: Pick<CustomerUpdate, "customerEmail" | "title" | "message">) {
  const update: CustomerUpdate = {
    id: `update-${await nextCustomerUpdateSequence()}`,
    customerEmail: input.customerEmail,
    title: input.title,
    message: input.message,
    createdAt: formatCreatedAt(),
    read: false
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      'INSERT INTO customer_updates (id, "customerEmail", title, message, "createdAt", "read") VALUES ($1, $2, $3, $4, $5, $6)',
      [update.id, update.customerEmail, update.title, update.message, update.createdAt, false]
    );
    return update;
  }

  const db = getSqliteDatabase();
  db.prepare("INSERT INTO customer_updates (id, customerEmail, title, message, createdAt, read) VALUES (?, ?, ?, ?, ?, ?)").run(
    update.id,
    update.customerEmail,
    update.title,
    update.message,
    update.createdAt,
    0
  );

  return update;
}

async function notifyCustomer(input: {
  customerEmail: string;
  title: string;
  message: string;
  details?: string[];
  html?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  await insertCustomerUpdate({
    customerEmail: input.customerEmail,
    title: input.title,
    message: input.message
  });

  const text = [
    "Hello,",
    "",
    input.title,
    input.message,
    ...(input.details && input.details.length > 0 ? ["", ...input.details] : []),
    "",
    "Swift Signate"
  ].join("\n");

  await sendCustomerEmail({
    to: input.customerEmail,
    subject: `Swift Signate: ${input.title}`,
    text,
    html: input.html ?? buildCustomerEmailHtml(input)
  });
}

async function insertContactRequest(input: ContactRequestInput) {
  const request: ContactRequest = {
    id: `contact-${await nextContactRequestSequence()}`,
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone.trim(),
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
    read: false
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      'INSERT INTO contact_requests (id, name, email, phone, message, "createdAt", "read") VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [request.id, request.name, request.email, request.phone, request.message, request.createdAt, false]
    );
    return request;
  }

  const db = getSqliteDatabase();
  db.prepare("INSERT INTO contact_requests (id, name, email, phone, message, createdAt, read) VALUES (?, ?, ?, ?, ?, ?, ?)").run(
    request.id,
    request.name,
    request.email,
    request.phone,
    request.message,
    request.createdAt,
    0
  );

  return request;
}

async function insertShipment(input: BookingInput) {
  const sequence = await nextShipmentSequence();
  const shipment: Shipment = {
    ref: formatTrackingNumber(sequence),
    airWaybill: formatAirWaybill(sequence),
    customer: input.customer,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    origin: input.origin,
    destination: input.destination,
    eta: input.eta,
    status: "Booked",
    packageType: input.packageType,
    paymentMethod: input.paymentMethod,
    clearanceFee: undefined,
    lastUpdate: buildLastUpdate("Booked", input),
    createdAt: formatCreatedAt(),
    details: input.details ?? null
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO shipments (
        ref, "airWaybill", customer, "customerEmail", "customerPhone", origin, destination, eta,
        status, "packageType", "paymentMethod", "clearanceFee", "lastUpdate", "createdAt", details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        shipment.ref,
        shipment.airWaybill,
        shipment.customer,
        shipment.customerEmail,
        shipment.customerPhone,
        shipment.origin,
        shipment.destination,
        shipment.eta,
        shipment.status,
        shipment.packageType,
        shipment.paymentMethod,
        shipment.clearanceFee ?? null,
        shipment.lastUpdate,
        shipment.createdAt,
        serializeDetails(shipment.details)
      ]
    );
    return shipment;
  }

  const db = getSqliteDatabase();
  db.prepare(`
    INSERT INTO shipments (
      ref, airWaybill, customer, customerEmail, customerPhone, origin, destination, eta,
      status, packageType, paymentMethod, clearanceFee, lastUpdate, createdAt, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    shipment.ref,
    shipment.airWaybill,
    shipment.customer,
    shipment.customerEmail,
    shipment.customerPhone,
    shipment.origin,
    shipment.destination,
    shipment.eta,
    shipment.status,
    shipment.packageType,
    shipment.paymentMethod,
    shipment.clearanceFee ?? null,
    shipment.lastUpdate,
    shipment.createdAt,
    serializeDetails(shipment.details)
  );

  return shipment;
}

export async function getOperationalStore(options?: {
  customerEmail?: string;
  includePaymentRequests?: boolean;
  includeContactRequests?: boolean;
}): Promise<ShipmentStoreState> {
  const allShipments = await listShipments();
  const shipments = options?.customerEmail
    ? allShipments.filter((shipment) => shipment.customerEmail.toLowerCase() === options.customerEmail?.toLowerCase())
    : allShipments;
  const allPaymentRequests =
    options?.includePaymentRequests || options?.customerEmail ? await listPaymentRequests() : [];
  const paymentRequests = options?.customerEmail
    ? allPaymentRequests.filter((request) => request.customerEmail.toLowerCase() === options.customerEmail?.toLowerCase())
    : allPaymentRequests;
  const allUpdates = await listCustomerUpdates();
  const contactRequests = options?.includeContactRequests ? await listContactRequests() : [];
  const partnerAccounts = options?.includePaymentRequests && !options?.customerEmail ? await listPartnerAccounts() : [];

  return {
    shipments,
    paymentRequests,
    customerUpdates: options?.customerEmail
      ? allUpdates.filter((update) => update.customerEmail.toLowerCase() === options.customerEmail?.toLowerCase())
      : allUpdates,
    contactRequests,
    partnerAccounts,
    nextSequence: await nextShipmentSequence()
  };
}

export async function getShipmentByTrackingReference(reference: string) {
  const normalizedReference = normalizeTrackingNumber(reference);

  if (!normalizedReference) {
    return null;
  }

  const shipments = await listShipments();

  return (
    shipments.find(
      (shipment) => normalizeTrackingNumber(shipment.ref) === normalizedReference
    ) ?? null
  );
}

export async function bookShipmentRecord(input: BookingInput) {
  const shipment = await insertShipment(input);

  await notifyCustomer({
    customerEmail: input.customerEmail,
    title: "Payment confirmed",
    message: `Your payment has been confirmed. Tracking number ${shipment.ref} is now ready.`,
    details: [
      `Tracking number: ${shipment.ref}`,
      `Route: ${shipment.origin} to ${shipment.destination}`,
      `Estimated delivery: ${shipment.eta}`,
      `Payment method: ${shipment.paymentMethod}`
    ]
  });

  return shipment;
}

export async function submitTransferRequestRecord(input: TransferRequestInput) {
  const request: PaymentRequest = {
    id: formatPaymentRequestId(await nextPaymentRequestSequence()),
    customer: input.customer,
    customerEmail: input.customerEmail,
    customerPhone: input.customerPhone,
    origin: input.origin,
    destination: input.destination,
    eta: input.eta,
    packageType: input.packageType,
    paymentMethod: "Direct transfer",
    serviceTitle: input.serviceTitle,
    amount: input.amount,
    status: input.paymentProofDataUrl ? "Payment submitted" : "Inquiry received",
    createdAt: formatCreatedAt(),
    note: input.note ?? "",
    bankName: input.bankName ?? "",
    accountNumber: input.accountNumber ?? "",
    accountName: input.accountName ?? "",
    quoteSentAt: input.quoteSentAt,
    invoiceNumber: undefined,
    invoiceIssuedAt: undefined,
    paymentProofName: input.paymentProofName ?? "",
    paymentProofType: input.paymentProofType ?? "",
    paymentProofDataUrl: input.paymentProofDataUrl ?? "",
    details: input.details ?? null
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO payment_requests (
        id, customer, "customerEmail", "customerPhone", origin, destination, eta, "packageType",
        "paymentMethod", "serviceTitle", amount, status, "createdAt", note, "bankName", "accountNumber", "accountName", "quoteSentAt",
        "invoiceNumber", "invoiceIssuedAt", "paymentProofName", "paymentProofType", "paymentProofDataUrl", "shipmentRef", "airWaybill", details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)`,
      [
        request.id,
        request.customer,
        request.customerEmail,
        request.customerPhone,
        request.origin,
        request.destination,
        request.eta,
        request.packageType,
        request.paymentMethod,
        request.serviceTitle,
        request.amount,
        request.status,
        request.createdAt,
        request.note,
        request.bankName ?? "",
        request.accountNumber ?? "",
        request.accountName ?? "",
        request.quoteSentAt ?? null,
        request.invoiceNumber ?? null,
        request.invoiceIssuedAt ?? null,
        request.paymentProofName,
        request.paymentProofType,
        request.paymentProofDataUrl,
        null,
        null,
        serializeDetails(request.details)
      ]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(`
      INSERT INTO payment_requests (
        id, customer, customerEmail, customerPhone, origin, destination, eta, packageType,
        paymentMethod, serviceTitle, amount, status, createdAt, note, bankName, accountNumber, accountName, quoteSentAt,
        invoiceNumber, invoiceIssuedAt, paymentProofName, paymentProofType, paymentProofDataUrl, shipmentRef, airWaybill, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      request.id,
      request.customer,
      request.customerEmail,
      request.customerPhone,
      request.origin,
      request.destination,
      request.eta,
      request.packageType,
      request.paymentMethod,
      request.serviceTitle,
      request.amount,
      request.status,
      request.createdAt,
      request.note,
      request.bankName ?? "",
      request.accountNumber ?? "",
      request.accountName ?? "",
      request.quoteSentAt ?? null,
      request.invoiceNumber ?? null,
      request.invoiceIssuedAt ?? null,
      request.paymentProofName,
      request.paymentProofType,
      request.paymentProofDataUrl,
      null,
      null,
      serializeDetails(request.details)
    );
  }

  await notifyCustomer({
    customerEmail: request.customerEmail,
    title: "Shipment inquiry received",
    message: "Your shipment request has been received. A Swift Signate admin will review it and send your quote shortly.",
    details: [
      `Request ID: ${request.id}`,
      `Service: ${request.serviceTitle}`,
      `Route: ${request.origin} to ${request.destination}`,
      `Package details: ${request.packageType}`
    ]
  });

  return request;
}

export async function approvePaymentRequestRecord(requestId: string) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request || !["Payment submitted", "Awaiting verification"].includes(request.status)) {
    return null;
  }

  const shipment = await insertShipment({
    customer: request.customer,
    customerEmail: request.customerEmail,
    customerPhone: request.customerPhone,
    origin: request.origin,
    destination: request.destination,
    eta: request.eta,
    packageType: request.packageType,
    paymentMethod: "Direct transfer",
    details: request.details ?? null
  });

  const invoiceNumber = formatInvoiceNumber(parseTrackingSequence(shipment.ref));
  const invoiceIssuedAt = new Date().toISOString();

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE payment_requests SET status = $1, "shipmentRef" = $2, "airWaybill" = $3, "invoiceNumber" = $4, "invoiceIssuedAt" = $5 WHERE id = $6',
      [
        "Approved",
        shipment.ref,
        shipment.airWaybill,
        invoiceNumber,
        invoiceIssuedAt,
        requestId
      ]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE payment_requests SET status = ?, shipmentRef = ?, airWaybill = ?, invoiceNumber = ?, invoiceIssuedAt = ? WHERE id = ?").run(
      "Approved",
      shipment.ref,
      shipment.airWaybill,
      invoiceNumber,
      invoiceIssuedAt,
      requestId
    );
  }

  const amountText = Number(request.amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  await notifyCustomer({
    customerEmail: request.customerEmail,
    title: "Payment confirmed",
    message: `Your payment has been confirmed. Invoice ${invoiceNumber} and tracking number ${shipment.ref} are now available.`,
    details: [
      `Invoice number: ${invoiceNumber}`,
      `Tracking number: ${shipment.ref}`,
      `Air waybill: ${shipment.airWaybill}`,
      `Service: ${request.serviceTitle}`,
      `Route: ${shipment.origin} to ${shipment.destination}`,
      `Estimated delivery: ${shipment.eta}`,
      `Amount received: NGN ${amountText}`
    ]
  });

  return shipment;
}

export async function rejectPaymentRequestRecord(
  requestId: string,
  reason = "Payment could not be confirmed. Please contact support."
) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request) {
    return null;
  }

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query("UPDATE payment_requests SET status = $1, note = $2 WHERE id = $3", ["Rejected", reason, requestId]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE payment_requests SET status = ?, note = ? WHERE id = ?").run("Rejected", reason, requestId);
  }

  await notifyCustomer({
    customerEmail: request.customerEmail,
    title: "Shipment request update",
    message: reason,
    details: [
      `Request ID: ${request.id}`,
      `Service: ${request.serviceTitle}`,
      `Route: ${request.origin} to ${request.destination}`
    ]
  });

  return true;
}

export async function sendPaymentRequestQuoteRecord(requestId: string) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request) {
    return null;
  }

  const nextQuoteSentAt = new Date().toISOString();
  const nextStatus: PaymentRequest["status"] = "Quote sent";

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query('UPDATE payment_requests SET status = $1, "quoteSentAt" = $2 WHERE id = $3', [nextStatus, nextQuoteSentAt, requestId]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE payment_requests SET status = ?, quoteSentAt = ? WHERE id = ?").run(nextStatus, nextQuoteSentAt, requestId);
  }

  const amountText = Number(request.amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  await notifyCustomer({
    customerEmail: request.customerEmail,
    title: "Your shipment quote is ready",
    message: "Swift Signate has reviewed your request and sent your shipment quote with payment details.",
    details: [
      `Request ID: ${request.id}`,
      `Business: ${request.customer}`,
      `Route: ${request.origin} to ${request.destination}`,
      `Service: ${request.serviceTitle}`,
      `Timeline: ${request.eta}`,
      `Package details: ${request.packageType}`,
      `Quote amount: NGN ${amountText}`,
      `Bank: ${request.bankName || "Not set"}`,
      `Account number: ${request.accountNumber || "Not set"}`,
      `Account name: ${request.accountName || "Not set"}`,
      request.note.trim() ? `Admin note: ${request.note.trim()}` : "Admin note: Please proceed with the quoted request from your dashboard.",
      "Next step: complete your sender and receiver details in your dashboard, then upload your payment proof after transfer."
    ]
  });

  return {
    ...request,
    status: nextStatus,
    quoteSentAt: nextQuoteSentAt
  };
}

export async function submitPaymentProofForRequestRecord(
  requestId: string,
  customerEmail: string,
  input: {
    paymentProofName: string;
    paymentProofType: string;
    paymentProofDataUrl: string;
  }
) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request || request.customerEmail.toLowerCase() !== customerEmail.trim().toLowerCase()) {
    return null;
  }

  if (!["Quote sent", "Rejected"].includes(request.status)) {
    return null;
  }

  if (!hasStoredRequestContacts(request.details)) {
    return null;
  }

  const nextStatus: PaymentRequest["status"] = "Payment submitted";

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE payment_requests
       SET status = $1, "paymentProofName" = $2, "paymentProofType" = $3, "paymentProofDataUrl" = $4
       WHERE id = $5`,
      [nextStatus, input.paymentProofName, input.paymentProofType, input.paymentProofDataUrl, requestId]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(
      `UPDATE payment_requests
       SET status = ?, paymentProofName = ?, paymentProofType = ?, paymentProofDataUrl = ?
       WHERE id = ?`
    ).run(nextStatus, input.paymentProofName, input.paymentProofType, input.paymentProofDataUrl, requestId);
  }

  await notifyCustomer({
    customerEmail: request.customerEmail,
    title: "Payment proof received",
    message: "Your payment proof has been uploaded successfully. Swift Signate will verify it and issue your tracking details after confirmation.",
    details: [
      `Request ID: ${request.id}`,
      `Service: ${request.serviceTitle}`,
      `Route: ${request.origin} to ${request.destination}`
    ]
  });

  return {
    ...request,
    status: nextStatus,
    paymentProofName: input.paymentProofName,
    paymentProofType: input.paymentProofType,
    paymentProofDataUrl: input.paymentProofDataUrl
  };
}

export async function saveCustomerRequestContactsRecord(
  requestId: string,
  customerEmail: string,
  input: {
    customerPhone: string;
    sender: ShipmentPartyDetails;
    receiver: ShipmentPartyDetails;
  }
) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request || request.customerEmail.toLowerCase() !== customerEmail.trim().toLowerCase() || request.status === "Approved") {
    return null;
  }

  const details = request.details ?? buildFallbackRequestDetails(request);

  return updatePaymentRequestRecord(requestId, {
    customerPhone: input.customerPhone.trim(),
    details: {
      ...details,
      sender: input.sender,
      receiver: input.receiver
    }
  });
}

export async function updatePaymentRequestRecord(requestId: string, updates: Partial<PaymentRequest>) {
  const requests = await listPaymentRequests();
  const current = requests.find((item) => item.id === requestId);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...updates
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE payment_requests
       SET customer = $1, "customerEmail" = $2, "customerPhone" = $3, origin = $4, destination = $5, eta = $6,
           "packageType" = $7, "paymentMethod" = $8, "serviceTitle" = $9, amount = $10, status = $11, "createdAt" = $12,
           note = $13, "bankName" = $14, "accountNumber" = $15, "accountName" = $16, "quoteSentAt" = $17,
           "invoiceNumber" = $18, "invoiceIssuedAt" = $19, "paymentProofName" = $20, "paymentProofType" = $21, "paymentProofDataUrl" = $22,
           "shipmentRef" = $23, "airWaybill" = $24, details = $25
       WHERE id = $26`,
      [
        next.customer,
        next.customerEmail,
        next.customerPhone,
        next.origin,
        next.destination,
        next.eta,
        next.packageType,
        next.paymentMethod,
        next.serviceTitle,
        next.amount,
        next.status,
        next.createdAt,
        next.note,
        next.bankName ?? "",
        next.accountNumber ?? "",
        next.accountName ?? "",
        next.quoteSentAt ?? null,
        next.invoiceNumber ?? null,
        next.invoiceIssuedAt ?? null,
        next.paymentProofName,
        next.paymentProofType,
        next.paymentProofDataUrl,
        next.shipmentRef ?? null,
        next.airWaybill ?? null,
        serializeDetails(next.details),
        requestId
      ]
    );
  } else {
    const db = getSqliteDatabase();
    db.prepare(`
      UPDATE payment_requests
      SET customer = ?, customerEmail = ?, customerPhone = ?, origin = ?, destination = ?, eta = ?,
          packageType = ?, paymentMethod = ?, serviceTitle = ?, amount = ?, status = ?, createdAt = ?,
          note = ?, bankName = ?, accountNumber = ?, accountName = ?, quoteSentAt = ?,
          invoiceNumber = ?, invoiceIssuedAt = ?, paymentProofName = ?, paymentProofType = ?, paymentProofDataUrl = ?, shipmentRef = ?, airWaybill = ?, details = ?
      WHERE id = ?
    `).run(
      next.customer,
      next.customerEmail,
      next.customerPhone,
      next.origin,
      next.destination,
      next.eta,
      next.packageType,
      next.paymentMethod,
      next.serviceTitle,
      next.amount,
      next.status,
      next.createdAt,
      next.note,
      next.bankName ?? "",
      next.accountNumber ?? "",
      next.accountName ?? "",
      next.quoteSentAt ?? null,
      next.invoiceNumber ?? null,
      next.invoiceIssuedAt ?? null,
      next.paymentProofName,
      next.paymentProofType,
      next.paymentProofDataUrl,
      next.shipmentRef ?? null,
      next.airWaybill ?? null,
      serializeDetails(next.details),
      requestId
    );
  }

  return next;
}

export async function updateShipmentRecordByRef(ref: string, updates: Partial<Shipment>) {
  const shipments = await listShipments();
  const current = shipments.find((item) => item.ref === ref);

  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...updates
  };

  next.ref = normalizeTrackingNumber(next.ref);

  if (updates.status && updates.status !== current.status) {
    next.lastUpdate = updates.lastUpdate ?? buildLastUpdate(updates.status, next);
    next.eta = updates.status === "Delivered" ? formatDeliveredAt() : next.eta;
  }

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `UPDATE shipments
      SET ref = $1, "airWaybill" = $2, customer = $3, "customerEmail" = $4, "customerPhone" = $5, origin = $6, destination = $7,
          eta = $8, status = $9, "packageType" = $10, "paymentMethod" = $11, "clearanceFee" = $12, "lastUpdate" = $13, "createdAt" = $14, details = $15
      WHERE ref = $16`,
      [
        next.ref,
        next.airWaybill,
        next.customer,
        next.customerEmail,
        next.customerPhone,
        next.origin,
        next.destination,
        next.eta,
        next.status,
        next.packageType,
        next.paymentMethod,
        next.clearanceFee ?? null,
        next.lastUpdate,
        next.createdAt,
        serializeDetails(next.details),
        ref
      ]
    );

    if (next.ref !== ref) {
      await pool.query('UPDATE payment_requests SET "shipmentRef" = $1 WHERE "shipmentRef" = $2', [next.ref, ref]);
    }
  } else {
    const db = getSqliteDatabase();
    db.prepare(`
      UPDATE shipments
      SET ref = ?, airWaybill = ?, customer = ?, customerEmail = ?, customerPhone = ?, origin = ?, destination = ?,
          eta = ?, status = ?, packageType = ?, paymentMethod = ?, clearanceFee = ?, lastUpdate = ?, createdAt = ?, details = ?
      WHERE ref = ?
    `).run(
      next.ref,
      next.airWaybill,
      next.customer,
      next.customerEmail,
      next.customerPhone,
      next.origin,
      next.destination,
      next.eta,
      next.status,
      next.packageType,
      next.paymentMethod,
      next.clearanceFee ?? null,
      next.lastUpdate,
      next.createdAt,
      serializeDetails(next.details),
      ref
    );

    if (next.ref !== ref) {
      db.prepare("UPDATE payment_requests SET shipmentRef = ? WHERE shipmentRef = ?").run(next.ref, ref);
    }
  }

  const shouldNotifyCustomer =
    Boolean(next.customerEmail.trim()) &&
    (next.ref !== current.ref ||
      next.status !== current.status ||
      next.origin !== current.origin ||
      next.destination !== current.destination ||
      next.eta !== current.eta ||
      next.clearanceFee !== current.clearanceFee ||
      next.lastUpdate !== current.lastUpdate ||
      next.packageType !== current.packageType);

  if (shouldNotifyCustomer) {
    const title =
      next.status !== current.status
        ? `Shipment ${next.ref} is now ${next.status}`
        : `Shipment ${next.ref} was updated`;

    await notifyCustomer({
      customerEmail: next.customerEmail,
      title,
      message: next.lastUpdate,
      details: [
        `Tracking number: ${next.ref}`,
        `Route: ${next.origin} to ${next.destination}`,
        `Estimated delivery: ${next.eta}`,
        `Package details: ${next.packageType}`,
        ...(typeof next.clearanceFee === "number" ? [`Clearance fee: ${formatMoney(next.clearanceFee)}`] : [])
      ],
      html: buildShipmentUpdateEmailHtml(next, title),
      actionLabel: "Track your shipment here",
      actionHref: `${getSiteUrl()}/dashboard/track?ref=${encodeURIComponent(next.ref)}`
    });
  }

  return next;
}

export async function markCustomerUpdateReadRecord(updateId: string, customerEmail?: string) {
  const updates = await listCustomerUpdates();
  const current = updates.find((update) => update.id === updateId);

  if (!current) {
    return null;
  }

  if (customerEmail && current.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
    return null;
  }

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query('UPDATE customer_updates SET "read" = TRUE WHERE id = $1', [updateId]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE customer_updates SET read = 1 WHERE id = ?").run(updateId);
  }

  return true;
}

export async function getSiteContentRecord() {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    const result = await pool.query<{ payload: string }>('SELECT payload FROM site_content WHERE id = $1 LIMIT 1', ["default"]);

    if (result.rows.length === 0) {
      return defaultSiteContent;
    }

    try {
      return mergeSiteContent(JSON.parse(result.rows[0].payload) as Partial<SiteContent>);
    } catch {
      return defaultSiteContent;
    }
  }

  const db = getSqliteDatabase();
  const row = db.prepare("SELECT payload FROM site_content WHERE id = 'default' LIMIT 1").get() as
    | { payload: string }
    | undefined;

  if (!row) {
    return defaultSiteContent;
  }

  try {
    return mergeSiteContent(JSON.parse(row.payload) as Partial<SiteContent>);
  } catch {
    return defaultSiteContent;
  }
}

export async function updateSiteContentRecord(content: SiteContent) {
  const next = mergeSiteContent(content);

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO site_content (id, payload, "updatedAt")
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, "updatedAt" = EXCLUDED."updatedAt"`,
      ["default", JSON.stringify(next), new Date().toISOString()]
    );
    return next;
  }

  const db = getSqliteDatabase();
  db.prepare("UPDATE site_content SET payload = ?, updatedAt = ? WHERE id = 'default'").run(
    JSON.stringify(next),
    new Date().toISOString()
  );

  return next;
}

export async function resetSiteContentRecord() {
  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO site_content (id, payload, "updatedAt")
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, "updatedAt" = EXCLUDED."updatedAt"`,
      ["default", JSON.stringify(defaultSiteContent), new Date().toISOString()]
    );
    return defaultSiteContent;
  }

  const db = getSqliteDatabase();
  db.prepare("UPDATE site_content SET payload = ?, updatedAt = ? WHERE id = 'default'").run(
    JSON.stringify(defaultSiteContent),
    new Date().toISOString()
  );

  return defaultSiteContent;
}

export async function submitContactRequestRecord(input: ContactRequestInput) {
  return insertContactRequest(input);
}

export async function updateContactRequestRecord(requestId: string, updates: Partial<ContactRequest>) {
  const requests = await listContactRequests();
  const current = requests.find((request) => request.id === requestId);

  if (!current) {
    return null;
  }

  const next: ContactRequest = {
    ...current,
    ...updates,
    email: (updates.email ?? current.email).trim().toLowerCase()
  };

  if (isSupabaseConfigured()) {
    await ensurePostgresSchema();
    const pool = getPostgresPool();
    await pool.query(
      'UPDATE contact_requests SET name = $1, email = $2, phone = $3, message = $4, "createdAt" = $5, "read" = $6 WHERE id = $7',
      [next.name, next.email, next.phone, next.message, next.createdAt, next.read, requestId]
    );
    return next;
  }

  const db = getSqliteDatabase();
  db.prepare("UPDATE contact_requests SET name = ?, email = ?, phone = ?, message = ?, createdAt = ?, read = ? WHERE id = ?").run(
    next.name,
    next.email,
    next.phone,
    next.message,
    next.createdAt,
    next.read ? 1 : 0,
    requestId
  );

  return next;
}

export async function getCurrentSiteContentPreview() {
  return previewTrackingNumber(await nextShipmentSequence());
}
