"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuthSession } from "@/components/auth-session";
import { ConsoleShell } from "@/components/console-shell";
import {
  previewAirWaybill,
  previewTrackingNumber,
  type PaymentRequest,
  type Shipment,
  type ShipmentStatus,
  useShipmentStore
} from "@/components/shipment-store";
import { type SiteContent, useSiteContentStore } from "@/components/site-content-store";

const shipmentStatuses: ShipmentStatus[] = ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"];
const paymentMethodOptions = ["Direct transfer", "Paystack"] as const;

function statusClasses(status: string) {
  switch (status) {
    case "Delivered":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "In transit":
      return "bg-orange-50 text-ember border-orange-200";
    case "Out for delivery":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Picked up":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Approved":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

const panelClassName = "surface-card rounded-[28px] p-6 md:p-7";
const fieldClassName =
  "h-11 w-full rounded-[16px] border border-black/8 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300";
const areaClassName =
  "min-h-[120px] w-full rounded-[20px] border border-black/8 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300";
const labelClassName = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-neutral-500";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  delay?: number;
};

function MetricCard({ label, value, detail, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={panelClassName}
    >
      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className="mt-4 text-4xl font-semibold text-neutral-950">{value}</div>
      <div className="mt-3 text-sm leading-6 text-neutral-600">{detail}</div>
    </motion.div>
  );
}

export function AdminPage() {
  const {
    shipments,
    paymentRequests,
    customerUpdates,
    nextSequence,
    approvePaymentRequest,
    rejectPaymentRequest,
    updateShipmentRecord,
    updatePaymentRequest
  } = useShipmentStore();
  const { currentAdmin, isAdminAuthenticated, loading: authLoading, signOut } = useAuthSession();
  const { content, updateContent, resetContent } = useSiteContentStore();

  const requestRecords = useMemo(
    () =>
      [...paymentRequests].sort((left, right) => {
        if (left.status === right.status) {
          return right.createdAt.localeCompare(left.createdAt);
        }

        return left.status === "Awaiting verification" ? -1 : 1;
      }),
    [paymentRequests]
  );
  const pendingTransfers = requestRecords.filter((request) => request.status === "Awaiting verification");

  const [selectedShipmentRef, setSelectedShipmentRef] = useState("");
  const [shipmentDraft, setShipmentDraft] = useState<Shipment | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestDraft, setRequestDraft] = useState<PaymentRequest | null>(null);
  const [shipmentMessage, setShipmentMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [contentDraft, setContentDraft] = useState(JSON.stringify(content, null, 2));
  const [contentMessage, setContentMessage] = useState("");

  useEffect(() => {
    if (!selectedShipmentRef && shipments.length > 0) {
      setSelectedShipmentRef(shipments[0].ref);
    }
  }, [shipments, selectedShipmentRef]);

  useEffect(() => {
    if (!selectedRequestId && requestRecords.length > 0) {
      const preferred = requestRecords.find((request) => request.status === "Awaiting verification") ?? requestRecords[0];
      setSelectedRequestId(preferred.id);
    }
  }, [requestRecords, selectedRequestId]);

  useEffect(() => {
    const nextShipment = shipments.find((shipment) => shipment.ref === selectedShipmentRef) ?? null;
    setShipmentDraft(nextShipment ? { ...nextShipment } : null);
  }, [selectedShipmentRef, shipments]);

  useEffect(() => {
    const nextRequest = requestRecords.find((request) => request.id === selectedRequestId) ?? null;
    setRequestDraft(nextRequest ? { ...nextRequest } : null);
  }, [selectedRequestId, requestRecords]);

  useEffect(() => {
    setContentDraft(JSON.stringify(content, null, 2));
  }, [content]);

  const totals = {
    shipments: shipments.length,
    active: shipments.filter((shipment) => shipment.status !== "Delivered").length,
    updates: customerUpdates.filter((update) => !update.read).length
  };

  const handleShipmentField = <K extends keyof Shipment>(field: K, value: Shipment[K]) => {
    setShipmentDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleRequestField = <K extends keyof PaymentRequest>(field: K, value: PaymentRequest[K]) => {
    setRequestDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleSaveShipment = async () => {
    if (!shipmentDraft || !selectedShipmentRef) {
      return;
    }

    try {
      await updateShipmentRecord(selectedShipmentRef, shipmentDraft);
      setSelectedShipmentRef(shipmentDraft.ref);
      setShipmentMessage(`Shipment ${shipmentDraft.ref} has been updated.`);
    } catch {
      setShipmentMessage("Could not save the shipment changes.");
    }
  };

  const persistRequestDraft = async () => {
    if (!requestDraft) {
      return;
    }

    await updatePaymentRequest(requestDraft.id, requestDraft);
  };

  const handleSaveRequest = async () => {
    if (!requestDraft) {
      return;
    }

    try {
      await persistRequestDraft();
      setRequestMessage(`Payment request ${requestDraft.id} has been updated.`);
    } catch {
      setRequestMessage("Could not save the payment request.");
    }
  };

  const handleApproveRequest = async () => {
    if (!requestDraft) {
      return;
    }

    try {
      await persistRequestDraft();
      const shipment = await approvePaymentRequest(requestDraft.id);
      if (shipment) {
        setRequestMessage(
          `Payment confirmed. Tracking number ${shipment.ref} and air waybill ${shipment.airWaybill} were issued automatically.`
        );
        setSelectedShipmentRef(shipment.ref);
        return;
      }
    } catch {
      setRequestMessage("That transfer request could not be approved.");
      return;
    }

    setRequestMessage("That transfer request could not be approved.");
  };

  const handleRejectRequest = async () => {
    if (!requestDraft) {
      return;
    }

    try {
      await persistRequestDraft();
      await rejectPaymentRequest(
        requestDraft.id,
        requestDraft.note.trim() || "Payment could not be confirmed. Please contact Swift Signate support."
      );
      setRequestMessage(`Payment request ${requestDraft.id} was rejected and the customer was notified.`);
    } catch {
      setRequestMessage("Could not reject the payment request.");
    }
  };

  const handleFormatContent = () => {
    try {
      const parsed = JSON.parse(contentDraft) as SiteContent;
      setContentDraft(JSON.stringify(parsed, null, 2));
      setContentMessage("Content JSON formatted.");
    } catch {
      setContentMessage("Content JSON is invalid. Fix the structure before formatting.");
    }
  };

  const handleSaveContent = async () => {
    try {
      const parsed = JSON.parse(contentDraft) as SiteContent;
      await updateContent(parsed);
      setContentMessage("Landing page, booking copy, icons, and images were updated.");
    } catch {
      setContentMessage("Content JSON is invalid. Fix the syntax and try again.");
    }
  };

  const handleResetContent = async () => {
    try {
      await resetContent();
      setContentMessage("Site content has been reset to the default Swift Signate content.");
    } catch {
      setContentMessage("Could not reset the site content.");
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-white px-4 py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-[28px] border border-black/8 bg-white p-8 text-sm text-neutral-600 shadow-[0_18px_40px_rgba(140,110,78,0.08)]">
          Verifying admin access...
        </div>
      </main>
    );
  }

  if (!isAdminAuthenticated) {
    return null;
  }

  return (
    <ConsoleShell active="admin" eyebrow="Operations workspace" title="Verify payments, edit shipments, and manage site content">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-[24px] border border-black/8 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-700">
            Signed in as <span className="font-semibold text-neutral-950">{currentAdmin?.email}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut();
              window.location.href = "/admin/signin";
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
          >
            Sign Out
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          <MetricCard
            label="Pending transfers"
            value={pendingTransfers.length.toString()}
            detail="Direct transfer requests waiting for finance verification."
          />
          <MetricCard
            label="All shipments"
            value={totals.shipments.toString()}
            detail={`${totals.active} shipments are still active in the network.`}
            delay={0.05}
          />
          <MetricCard
            label="Customer updates"
            value={totals.updates.toString()}
            detail="Unread customer notifications currently stored in the shared shipment store."
            delay={0.1}
          />
          <MetricCard
            label="Next IDs"
            value={previewTrackingNumber(nextSequence)}
            detail={`Next AWB: ${previewAirWaybill(nextSequence)}`}
            delay={0.15}
          />
        </div>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Transfer approvals</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Verify direct-transfer payments before shipment issuance</h2>
            </div>
            <div className="text-sm text-neutral-500">
              Direct transfers create tracking numbers only after an admin approval.
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              {requestRecords.length === 0 ? (
                <div className="rounded-[24px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                  No payment requests have been submitted yet.
                </div>
              ) : (
                requestRecords.map((request) => {
                  const selected = request.id === selectedRequestId;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedRequestId(request.id)}
                      className={[
                        "w-full rounded-[24px] border p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                        selected ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white hover:border-orange-200"
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-950">{request.serviceTitle}</div>
                          <div className="mt-1 text-sm text-neutral-600">{request.customer}</div>
                        </div>
                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                            statusClasses(request.status)
                          ].join(" ")}
                        >
                          {request.status}
                        </span>
                      </div>
                      <div className="mt-3 text-sm text-neutral-700">
                        {request.origin} {"->"} {request.destination}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                        <span>{request.id}</span>
                        <span>{new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(request.amount)}</span>
                        <span>{request.createdAt}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
              {requestDraft ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Selected request</div>
                      <h3 className="mt-3 text-2xl font-semibold text-neutral-950">{requestDraft.id}</h3>
                    </div>
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                        statusClasses(requestDraft.status)
                      ].join(" ")}
                    >
                      {requestDraft.status}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className={labelClassName}>Customer</span>
                      <input
                        value={requestDraft.customer}
                        onChange={(event) => handleRequestField("customer", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Service title</span>
                      <input
                        value={requestDraft.serviceTitle}
                        onChange={(event) => handleRequestField("serviceTitle", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer email</span>
                      <input
                        value={requestDraft.customerEmail}
                        onChange={(event) => handleRequestField("customerEmail", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer phone</span>
                      <input
                        value={requestDraft.customerPhone}
                        onChange={(event) => handleRequestField("customerPhone", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Origin</span>
                      <input
                        value={requestDraft.origin}
                        onChange={(event) => handleRequestField("origin", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Destination</span>
                      <input
                        value={requestDraft.destination}
                        onChange={(event) => handleRequestField("destination", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Estimated delivery</span>
                      <input
                        value={requestDraft.eta}
                        onChange={(event) => handleRequestField("eta", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Package type</span>
                      <input
                        value={requestDraft.packageType}
                        onChange={(event) => handleRequestField("packageType", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Amount</span>
                      <input
                        type="number"
                        value={requestDraft.amount}
                        onChange={(event) => handleRequestField("amount", Number(event.target.value))}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Status</span>
                      <select
                        value={requestDraft.status}
                        onChange={(event) => handleRequestField("status", event.target.value as PaymentRequest["status"])}
                        className={fieldClassName}
                      >
                        {["Awaiting verification", "Approved", "Rejected"].map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Admin note / rejection reason</span>
                      <textarea
                        value={requestDraft.note}
                        onChange={(event) => handleRequestField("note", event.target.value)}
                        className={areaClassName}
                      />
                    </label>
                    <div className="md:col-span-2 rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4">
                      <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Payment proof</div>
                      <div className="mt-2 text-sm text-neutral-700">
                        {requestDraft.paymentProofName || "No proof attached"}
                      </div>
                      {requestDraft.paymentProofDataUrl && (
                        <div className="mt-4 space-y-3">
                          {requestDraft.paymentProofType.startsWith("image/") ? (
                            <img
                              src={requestDraft.paymentProofDataUrl}
                              alt={requestDraft.paymentProofName || "Payment proof"}
                              className="max-h-[240px] rounded-[16px] border border-black/8 object-contain"
                            />
                          ) : (
                            <div className="rounded-[16px] border border-black/8 bg-white px-4 py-3 text-sm text-neutral-600">
                              PDF receipt attached.
                            </div>
                          )}
                          <a
                            href={requestDraft.paymentProofDataUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] border border-orange-200 bg-white px-4 text-sm font-medium text-ember"
                          >
                            Open proof
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSaveRequest}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
                    >
                      Save payment request
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveRequest}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] bg-ember px-5 text-sm font-semibold text-white"
                    >
                      Approve and issue shipment
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectRequest}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-red-200 bg-white px-5 text-sm font-medium text-red-700"
                    >
                      Reject transfer
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-neutral-600">Select a payment request to review it.</div>
              )}

              {requestMessage && (
                <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                  {requestMessage}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Shipment editor</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Update every customer shipment record</h2>
            </div>
            <div className="text-sm text-neutral-500">Changes here update what customers see on the tracking page.</div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              {shipments.map((shipment) => {
                const selected = shipment.ref === selectedShipmentRef;

                return (
                  <button
                    key={shipment.ref}
                    type="button"
                    onClick={() => setSelectedShipmentRef(shipment.ref)}
                    className={[
                      "w-full rounded-[24px] border p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                      selected ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white hover:border-orange-200"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-neutral-950">{shipment.ref}</div>
                        <div className="mt-1 text-sm text-neutral-600">{shipment.customer}</div>
                      </div>
                      <span
                        className={[
                          "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                          statusClasses(shipment.status)
                        ].join(" ")}
                      >
                        {shipment.status}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-neutral-700">
                      {shipment.origin} {"->"} {shipment.destination}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-500">
                      AWB {shipment.airWaybill}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
              {shipmentDraft ? (
                <>
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Selected shipment</div>
                  <h3 className="mt-3 text-2xl font-semibold text-neutral-950">{shipmentDraft.ref}</h3>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className={labelClassName}>Tracking number</span>
                      <input
                        value={shipmentDraft.ref}
                        onChange={(event) => handleShipmentField("ref", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Air waybill</span>
                      <input
                        value={shipmentDraft.airWaybill}
                        onChange={(event) => handleShipmentField("airWaybill", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer</span>
                      <input
                        value={shipmentDraft.customer}
                        onChange={(event) => handleShipmentField("customer", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Payment method</span>
                      <select
                        value={shipmentDraft.paymentMethod}
                        onChange={(event) =>
                          handleShipmentField("paymentMethod", event.target.value as Shipment["paymentMethod"])
                        }
                        className={fieldClassName}
                      >
                        {paymentMethodOptions.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelClassName}>Customer email</span>
                      <input
                        value={shipmentDraft.customerEmail}
                        onChange={(event) => handleShipmentField("customerEmail", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer phone</span>
                      <input
                        value={shipmentDraft.customerPhone}
                        onChange={(event) => handleShipmentField("customerPhone", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Origin</span>
                      <input
                        value={shipmentDraft.origin}
                        onChange={(event) => handleShipmentField("origin", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Destination</span>
                      <input
                        value={shipmentDraft.destination}
                        onChange={(event) => handleShipmentField("destination", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Estimated delivery</span>
                      <input
                        value={shipmentDraft.eta}
                        onChange={(event) => handleShipmentField("eta", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Package type</span>
                      <input
                        value={shipmentDraft.packageType}
                        onChange={(event) => handleShipmentField("packageType", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Status</span>
                      <select
                        value={shipmentDraft.status}
                        onChange={(event) => handleShipmentField("status", event.target.value as ShipmentStatus)}
                        className={fieldClassName}
                      >
                        {shipmentStatuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelClassName}>Created at</span>
                      <input
                        value={shipmentDraft.createdAt}
                        onChange={(event) => handleShipmentField("createdAt", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Latest update</span>
                      <textarea
                        value={shipmentDraft.lastUpdate}
                        onChange={(event) => handleShipmentField("lastUpdate", event.target.value)}
                        className={areaClassName}
                      />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={handleSaveShipment}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] bg-ember px-5 text-sm font-semibold text-white"
                    >
                      Save shipment changes
                    </button>
                    <div className="rounded-[18px] border border-black/8 bg-[#fcfaf7] px-4 py-3 text-sm text-neutral-600">
                      Next default IDs: {previewTrackingNumber(nextSequence)} / {previewAirWaybill(nextSequence)}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-neutral-600">Select a shipment to edit it.</div>
              )}

              {shipmentMessage && (
                <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                  {shipmentMessage}
                </div>
              )}
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Site content studio</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Edit landing page, booking modal, icons, images, and copy</h2>
            </div>
            <div className="text-sm text-neutral-500">
              Save JSON here to update hero content, service cards, icons, contact modal copy, and customer-page text.
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
            <textarea
              value={contentDraft}
              onChange={(event) => setContentDraft(event.target.value)}
              spellCheck={false}
              className="min-h-[520px] w-full rounded-[20px] border border-black/8 bg-[#faf9f7] px-4 py-4 font-mono text-[13px] leading-6 text-neutral-900 outline-none transition-colors focus:border-orange-300"
            />

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleFormatContent}
                className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
              >
                Format JSON
              </button>
              <button
                type="button"
                onClick={handleSaveContent}
                className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] bg-ember px-5 text-sm font-semibold text-white"
              >
                Save site content
              </button>
              <button
                type="button"
                onClick={handleResetContent}
                className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-red-200 bg-white px-5 text-sm font-medium text-red-700"
              >
                Reset to defaults
              </button>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4 text-sm leading-6 text-neutral-700">
                Use the `backgroundImage`, `image`, and `icon` fields to control visual assets. Service cards, why-us cards, and
                process steps all update from this JSON.
              </div>
              <div className="rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4 text-sm leading-6 text-neutral-700">
                `customerPages` controls booking-page and modal copy, including step labels and payment messaging for transfer and
                Paystack.
              </div>
            </div>

            {contentMessage && (
              <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                {contentMessage}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </ConsoleShell>
  );
}
