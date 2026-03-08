import "server-only";

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { getMySqlPool, isMySqlConfigured } from "@/lib/mysql";
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
  formatPaymentRequestId,
  formatTrackingNumber,
  type PaymentRequest,
  previewTrackingNumber,
  seedShipments,
  type Shipment,
  type ShipmentStoreState,
  type TransferRequestInput
} from "@/lib/shipment-model";
import { defaultSiteContent, mergeSiteContent, type SiteContent } from "@/lib/site-content-model";

const DB_PATH = join(process.cwd(), "data", "swift-signate-operations.db");

type SqliteDatabase = import("node:sqlite").DatabaseSync;

const require = createRequire(import.meta.url);

let sqliteDatabase: SqliteDatabase | null = null;
let mySqlReady: Promise<void> | null = null;

type PaymentRequestRow = Omit<PaymentRequest, "shipmentRef" | "airWaybill" | "details"> & {
  shipmentRef: string | null;
  airWaybill: string | null;
  details: string | null;
};

type CustomerUpdateRow = Omit<CustomerUpdate, "read"> & {
  read: number;
};

type ShipmentRow = Omit<Shipment, "details"> & {
  details: string | null;
};

type ContactRequestRow = Omit<ContactRequest, "read"> & {
  read: number;
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

function mapShipment(row: ShipmentRow): Shipment {
  return {
    ...row,
    details: parseDetails(row.details)
  };
}

function ensureSqliteColumn(db: SqliteDatabase, table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;

  if (!columns.some((current) => current.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function ensureMySqlColumn(table: string, column: string, definition: string) {
  const pool = getMySqlPool();
  const [rows] = (await pool.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1",
    [table, column]
  )) as unknown as [Array<{ COLUMN_NAME: string }>];

  if (rows.length === 0) {
    await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
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
  ensureSqliteColumn(sqliteDatabase, "payment_requests", "details", "TEXT");

  seedSqliteDatabase(sqliteDatabase);

  return sqliteDatabase;
}

async function ensureMySqlSchema() {
  if (!isMySqlConfigured()) {
    return;
  }

  if (!mySqlReady) {
    mySqlReady = (async () => {
      const pool = getMySqlPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS shipments (
          ref VARCHAR(64) PRIMARY KEY,
          airWaybill VARCHAR(64) NOT NULL,
          customer VARCHAR(191) NOT NULL,
          customerEmail VARCHAR(191) NOT NULL,
          customerPhone VARCHAR(64) NOT NULL,
          origin VARCHAR(191) NOT NULL,
          destination VARCHAR(191) NOT NULL,
          eta VARCHAR(191) NOT NULL,
          status VARCHAR(32) NOT NULL,
          packageType VARCHAR(191) NOT NULL,
          paymentMethod VARCHAR(32) NOT NULL,
          lastUpdate TEXT NOT NULL,
          createdAt VARCHAR(64) NOT NULL,
          details LONGTEXT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS payment_requests (
          id VARCHAR(64) PRIMARY KEY,
          customer VARCHAR(191) NOT NULL,
          customerEmail VARCHAR(191) NOT NULL,
          customerPhone VARCHAR(64) NOT NULL,
          origin VARCHAR(191) NOT NULL,
          destination VARCHAR(191) NOT NULL,
          eta VARCHAR(191) NOT NULL,
          packageType VARCHAR(191) NOT NULL,
          paymentMethod VARCHAR(32) NOT NULL,
          serviceTitle VARCHAR(191) NOT NULL,
          amount DECIMAL(14,2) NOT NULL,
          status VARCHAR(32) NOT NULL,
          createdAt VARCHAR(64) NOT NULL,
          note TEXT NOT NULL,
          paymentProofName VARCHAR(191) NOT NULL,
          paymentProofType VARCHAR(128) NOT NULL,
          paymentProofDataUrl LONGTEXT NOT NULL,
          shipmentRef VARCHAR(64) NULL,
          airWaybill VARCHAR(64) NULL,
          details LONGTEXT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customer_updates (
          id VARCHAR(64) PRIMARY KEY,
          customerEmail VARCHAR(191) NOT NULL,
          title VARCHAR(191) NOT NULL,
          message TEXT NOT NULL,
          createdAt VARCHAR(64) NOT NULL,
          \`read\` TINYINT(1) NOT NULL DEFAULT 0
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS site_content (
          id VARCHAR(64) PRIMARY KEY,
          payload LONGTEXT NOT NULL,
          updatedAt VARCHAR(64) NOT NULL
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS contact_requests (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(191) NOT NULL,
          email VARCHAR(191) NOT NULL,
          phone VARCHAR(64) NOT NULL,
          message TEXT NOT NULL,
          createdAt VARCHAR(64) NOT NULL,
          \`read\` TINYINT(1) NOT NULL DEFAULT 0
        )
      `);
      await ensureMySqlColumn("shipments", "details", "LONGTEXT NULL");
      await ensureMySqlColumn("payment_requests", "details", "LONGTEXT NULL");
      await seedMySqlDatabase();
    })();
  }

  await mySqlReady;
}

function seedSqliteDatabase(db: SqliteDatabase) {
  const shipmentCount = db.prepare("SELECT COUNT(*) as count FROM shipments").get() as { count: number };
  if (shipmentCount.count === 0) {
    const insertShipment = db.prepare(`
      INSERT INTO shipments (
        ref, airWaybill, customer, customerEmail, customerPhone, origin, destination, eta,
        status, packageType, paymentMethod, lastUpdate, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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

async function seedMySqlDatabase() {
  const pool = getMySqlPool();
  const [shipmentRows] = (await pool.query("SELECT COUNT(*) as count FROM shipments")) as unknown as [Array<{ count: number }>];

  if (Number(shipmentRows[0]?.count ?? 0) === 0) {
    for (const shipment of seedShipments) {
      await pool.query(
        `INSERT INTO shipments (
          ref, airWaybill, customer, customerEmail, customerPhone, origin, destination, eta,
          status, packageType, paymentMethod, lastUpdate, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          shipment.lastUpdate,
          shipment.createdAt
        ]
      );
    }
  }

  const [contentRows] = (await pool.query("SELECT id FROM site_content WHERE id = 'default' LIMIT 1")) as unknown as [
    Array<{ id: string }>
  ];

  if (contentRows.length === 0) {
    await pool.query("INSERT INTO site_content (id, payload, updatedAt) VALUES (?, ?, ?)", [
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

async function listShipments() {
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    const [rows] = (await pool.query("SELECT * FROM shipments ORDER BY ref DESC")) as unknown as [ShipmentRow[]];
    return rows.map(mapShipment);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM shipments ORDER BY ref DESC").all() as ShipmentRow[]).map(mapShipment);
}

async function listPaymentRequests() {
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    const [rows] = (await pool.query("SELECT * FROM payment_requests ORDER BY id DESC")) as unknown as [PaymentRequestRow[]];
    return rows.map(mapPaymentRequest);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM payment_requests ORDER BY id DESC").all() as PaymentRequestRow[]).map(mapPaymentRequest);
}

async function listCustomerUpdates() {
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    const [rows] = (await pool.query("SELECT * FROM customer_updates ORDER BY id DESC")) as unknown as [CustomerUpdateRow[]];
    return rows.map(mapCustomerUpdate);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM customer_updates ORDER BY id DESC").all() as CustomerUpdateRow[]).map(mapCustomerUpdate);
}

async function listContactRequests() {
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    const [rows] = (await pool.query("SELECT * FROM contact_requests ORDER BY createdAt DESC, id DESC")) as unknown as [
      ContactRequestRow[]
    ];
    return rows.map(mapContactRequest);
  }

  const db = getSqliteDatabase();
  return (db.prepare("SELECT * FROM contact_requests ORDER BY createdAt DESC, id DESC").all() as ContactRequestRow[]).map(
    mapContactRequest
  );
}

async function nextShipmentSequence() {
  const shipments = await listShipments();
  return Math.max(...shipments.map((shipment) => Number(shipment.ref.split("-").pop() ?? 100000)), 100000) + 1;
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      "INSERT INTO customer_updates (id, customerEmail, title, message, createdAt, `read`) VALUES (?, ?, ?, ?, ?, ?)",
      [update.id, update.customerEmail, update.title, update.message, update.createdAt, 0]
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      "INSERT INTO contact_requests (id, name, email, phone, message, createdAt, `read`) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [request.id, request.name, request.email, request.phone, request.message, request.createdAt, 0]
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
    lastUpdate: buildLastUpdate("Booked", input),
    createdAt: formatCreatedAt(),
    details: input.details ?? null
  };

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      `INSERT INTO shipments (
        ref, airWaybill, customer, customerEmail, customerPhone, origin, destination, eta,
        status, packageType, paymentMethod, lastUpdate, createdAt, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      status, packageType, paymentMethod, lastUpdate, createdAt, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  const paymentRequests = options?.includePaymentRequests ? await listPaymentRequests() : [];
  const allUpdates = await listCustomerUpdates();
  const contactRequests = options?.includeContactRequests ? await listContactRequests() : [];

  return {
    shipments,
    paymentRequests,
    customerUpdates: options?.customerEmail
      ? allUpdates.filter((update) => update.customerEmail.toLowerCase() === options.customerEmail?.toLowerCase())
      : allUpdates,
    contactRequests,
    nextSequence: await nextShipmentSequence()
  };
}

export async function bookShipmentRecord(input: BookingInput) {
  const shipment = await insertShipment(input);

  await insertCustomerUpdate({
    customerEmail: input.customerEmail,
    title: "Payment confirmed",
    message: `Your payment has been confirmed. Tracking number ${shipment.ref} and air waybill ${shipment.airWaybill} are now ready.`
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
    status: "Awaiting verification",
    createdAt: formatCreatedAt(),
    note: input.note ?? "",
    paymentProofName: input.paymentProofName,
    paymentProofType: input.paymentProofType,
    paymentProofDataUrl: input.paymentProofDataUrl,
    details: input.details ?? null
  };

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      `INSERT INTO payment_requests (
        id, customer, customerEmail, customerPhone, origin, destination, eta, packageType,
        paymentMethod, serviceTitle, amount, status, createdAt, note,
        paymentProofName, paymentProofType, paymentProofDataUrl, shipmentRef, airWaybill, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        request.paymentProofName,
        request.paymentProofType,
        request.paymentProofDataUrl,
        null,
        null,
        serializeDetails(request.details)
      ]
    );
    return request;
  }

  const db = getSqliteDatabase();
  db.prepare(`
    INSERT INTO payment_requests (
      id, customer, customerEmail, customerPhone, origin, destination, eta, packageType,
      paymentMethod, serviceTitle, amount, status, createdAt, note,
      paymentProofName, paymentProofType, paymentProofDataUrl, shipmentRef, airWaybill, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    request.paymentProofName,
    request.paymentProofType,
    request.paymentProofDataUrl,
    null,
    null,
    serializeDetails(request.details)
  );

  return request;
}

export async function approvePaymentRequestRecord(requestId: string) {
  const requests = await listPaymentRequests();
  const request = requests.find((item) => item.id === requestId);

  if (!request || request.status !== "Awaiting verification") {
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query("UPDATE payment_requests SET status = ?, shipmentRef = ?, airWaybill = ? WHERE id = ?", [
      "Approved",
      shipment.ref,
      shipment.airWaybill,
      requestId
    ]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE payment_requests SET status = ?, shipmentRef = ?, airWaybill = ? WHERE id = ?").run(
      "Approved",
      shipment.ref,
      shipment.airWaybill,
      requestId
    );
  }

  await insertCustomerUpdate({
    customerEmail: request.customerEmail,
    title: "Transfer confirmed",
    message: `Your transfer has been confirmed. Tracking number ${shipment.ref} and air waybill ${shipment.airWaybill} are now available.`
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query("UPDATE payment_requests SET status = ?, note = ? WHERE id = ?", ["Rejected", reason, requestId]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE payment_requests SET status = ?, note = ? WHERE id = ?").run("Rejected", reason, requestId);
  }

  await insertCustomerUpdate({
    customerEmail: request.customerEmail,
    title: "Transfer update",
    message: reason
  });

  return true;
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      `UPDATE payment_requests
       SET customer = ?, customerEmail = ?, customerPhone = ?, origin = ?, destination = ?, eta = ?,
           packageType = ?, paymentMethod = ?, serviceTitle = ?, amount = ?, status = ?, createdAt = ?,
           note = ?, paymentProofName = ?, paymentProofType = ?, paymentProofDataUrl = ?, shipmentRef = ?, airWaybill = ?, details = ?
       WHERE id = ?`,
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
          note = ?, paymentProofName = ?, paymentProofType = ?, paymentProofDataUrl = ?, shipmentRef = ?, airWaybill = ?, details = ?
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

  if (updates.status && updates.status !== current.status) {
    next.lastUpdate = updates.lastUpdate ?? buildLastUpdate(updates.status, next);
    next.eta = updates.status === "Delivered" ? formatDeliveredAt() : next.eta;
  }

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      `UPDATE shipments
       SET ref = ?, airWaybill = ?, customer = ?, customerEmail = ?, customerPhone = ?, origin = ?, destination = ?,
           eta = ?, status = ?, packageType = ?, paymentMethod = ?, lastUpdate = ?, createdAt = ?, details = ?
       WHERE ref = ?`,
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
        next.lastUpdate,
        next.createdAt,
        serializeDetails(next.details),
        ref
      ]
    );

    if (next.ref !== ref) {
      await pool.query("UPDATE payment_requests SET shipmentRef = ? WHERE shipmentRef = ?", [next.ref, ref]);
    }
  } else {
    const db = getSqliteDatabase();
    db.prepare(`
      UPDATE shipments
      SET ref = ?, airWaybill = ?, customer = ?, customerEmail = ?, customerPhone = ?, origin = ?, destination = ?,
          eta = ?, status = ?, packageType = ?, paymentMethod = ?, lastUpdate = ?, createdAt = ?, details = ?
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
      next.lastUpdate,
      next.createdAt,
      serializeDetails(next.details),
      ref
    );

    if (next.ref !== ref) {
      db.prepare("UPDATE payment_requests SET shipmentRef = ? WHERE shipmentRef = ?").run(next.ref, ref);
    }
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query("UPDATE customer_updates SET `read` = 1 WHERE id = ?", [updateId]);
  } else {
    const db = getSqliteDatabase();
    db.prepare("UPDATE customer_updates SET read = 1 WHERE id = ?").run(updateId);
  }

  return true;
}

export async function getSiteContentRecord() {
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    const [rows] = (await pool.query("SELECT payload FROM site_content WHERE id = 'default' LIMIT 1")) as unknown as [
      Array<{ payload: string }>
    ];

    if (rows.length === 0) {
      return defaultSiteContent;
    }

    try {
      return mergeSiteContent(JSON.parse(rows[0].payload) as Partial<SiteContent>);
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query("UPDATE site_content SET payload = ?, updatedAt = ? WHERE id = 'default'", [
      JSON.stringify(next),
      new Date().toISOString()
    ]);
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
  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query("UPDATE site_content SET payload = ?, updatedAt = ? WHERE id = 'default'", [
      JSON.stringify(defaultSiteContent),
      new Date().toISOString()
    ]);
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

  if (isMySqlConfigured()) {
    await ensureMySqlSchema();
    const pool = getMySqlPool();
    await pool.query(
      "UPDATE contact_requests SET name = ?, email = ?, phone = ?, message = ?, createdAt = ?, `read` = ? WHERE id = ?",
      [next.name, next.email, next.phone, next.message, next.createdAt, next.read ? 1 : 0, requestId]
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
