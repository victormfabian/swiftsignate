"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuthSession } from "@/components/auth-session";
import { ConsoleShell } from "@/components/console-shell";
import {
  previewAirWaybill,
  previewTrackingNumber,
  type ContactRequest,
  type PaymentRequest,
  type Shipment,
  type ShipmentStatus,
  useShipmentStore
} from "@/components/shipment-store";
import { type ContentCard, type SiteContent, useSiteContentStore } from "@/components/site-content-store";

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

function cloneContent(content: SiteContent) {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

export function AdminPage() {
  const {
    shipments,
    paymentRequests,
    customerUpdates,
    contactRequests,
    nextSequence,
    approvePaymentRequest,
    rejectPaymentRequest,
    updateShipmentRecord,
    updatePaymentRequest,
    updateContactRequest
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
  const [contentDraft, setContentDraft] = useState<SiteContent>(cloneContent(content));
  const [contentMessage, setContentMessage] = useState("");
  const [selectedContactRequestId, setSelectedContactRequestId] = useState("");
  const [contactRequestDraft, setContactRequestDraft] = useState<ContactRequest | null>(null);
  const [contactRequestMessage, setContactRequestMessage] = useState("");

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
    if (!selectedContactRequestId && contactRequests.length > 0) {
      setSelectedContactRequestId(contactRequests[0].id);
    }
  }, [contactRequests, selectedContactRequestId]);

  useEffect(() => {
    const nextShipment = shipments.find((shipment) => shipment.ref === selectedShipmentRef) ?? null;
    setShipmentDraft(nextShipment ? { ...nextShipment } : null);
  }, [selectedShipmentRef, shipments]);

  useEffect(() => {
    const nextRequest = requestRecords.find((request) => request.id === selectedRequestId) ?? null;
    setRequestDraft(nextRequest ? { ...nextRequest } : null);
  }, [selectedRequestId, requestRecords]);

  useEffect(() => {
    const nextContactRequest = contactRequests.find((request) => request.id === selectedContactRequestId) ?? null;
    setContactRequestDraft(nextContactRequest ? { ...nextContactRequest } : null);
  }, [contactRequests, selectedContactRequestId]);

  useEffect(() => {
    setContentDraft(cloneContent(content));
  }, [content]);

  const totals = {
    shipments: shipments.length,
    active: shipments.filter((shipment) => shipment.status !== "Delivered").length,
    updates: customerUpdates.filter((update) => !update.read).length,
    contactRequests: contactRequests.filter((request) => !request.read).length
  };

  const handleShipmentField = <K extends keyof Shipment>(field: K, value: Shipment[K]) => {
    setShipmentDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleRequestField = <K extends keyof PaymentRequest>(field: K, value: PaymentRequest[K]) => {
    setRequestDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleContactRequestField = <K extends keyof ContactRequest>(field: K, value: ContactRequest[K]) => {
    setContactRequestDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleContentField = <
    Section extends keyof SiteContent,
    Field extends keyof SiteContent[Section]
  >(
    section: Section,
    field: Field,
    value: SiteContent[Section][Field]
  ) => {
    setContentDraft((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [field]: value
      }
    }));
  };

  const handleCardField = (
    section: "services" | "whyUs",
    index: number,
    field: keyof ContentCard,
    value: string
  ) => {
    if (section === "services") {
      setContentDraft((current) => {
        const cards = [...current.services.cards];
        cards[index] = {
          ...cards[index],
          [field]: value
        };

        return {
          ...current,
          services: {
            ...current.services,
            cards
          }
        };
      });
      return;
    }

    setContentDraft((current) => {
      const cards = [...current.whyUs.points];
      cards[index] = {
        ...cards[index],
        [field]: value
      };

      return {
        ...current,
        whyUs: {
          ...current.whyUs,
          points: cards
        }
      };
    });
  };

  const handleProcessStepField = (index: number, field: "title" | "copy" | "icon", value: string) => {
    setContentDraft((current) => {
      const steps = [...current.process.steps];
      steps[index] = {
        ...steps[index],
        [field]: value
      };

      return {
        ...current,
        process: {
          ...current.process,
          steps
        }
      };
    });
  };

  const handleStepLabelField = (
    field: keyof SiteContent["customerPages"]["stepLabels"],
    value: string
  ) => {
    setContentDraft((current) => ({
      ...current,
      customerPages: {
        ...current.customerPages,
        stepLabels: {
          ...current.customerPages.stepLabels,
          [field]: value
        }
      }
    }));
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

  const handleSaveContent = async () => {
    try {
      await updateContent(contentDraft);
      setContentMessage("Landing page, booking copy, icons, and images were updated.");
    } catch {
      setContentMessage("Could not save the site content right now.");
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

  const handleSaveContactRequest = async () => {
    if (!contactRequestDraft) {
      return;
    }

    try {
      await updateContactRequest(contactRequestDraft.id, contactRequestDraft);
      setContactRequestMessage(`Contact request ${contactRequestDraft.id} has been updated.`);
    } catch {
      setContactRequestMessage("Could not save the contact request.");
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
    <ConsoleShell active="admin" eyebrow="Swift Admin" title="Manage payments, bookings, content, and customer records">
      <div className="space-y-6">
        <div className="flex flex-col gap-3 rounded-[24px] border border-black/8 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-neutral-700">
            Signed in as <span className="font-semibold text-neutral-950">{currentAdmin?.email}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              void signOut();
              window.location.href = "/swiftadmin/signin";
            }}
            className="inline-flex min-h-[44px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
          >
            Sign Out
          </button>
        </div>

        <div className="grid gap-4 xl:grid-cols-5">
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
            label="Contact requests"
            value={totals.contactRequests.toString()}
            detail="Unread website contact submissions stored from the landing-page modal."
            delay={0.12}
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
          transition={{ duration: 0.4, delay: 0.04 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Contact inbox</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Website contact form submissions</h2>
            </div>
            <div className="text-sm text-neutral-500">Every submitted contact form is stored in MySQL for follow-up.</div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              {contactRequests.length === 0 ? (
                <div className="rounded-[24px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                  No website contact requests have been submitted yet.
                </div>
              ) : (
                contactRequests.map((request) => {
                  const selected = request.id === selectedContactRequestId;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => setSelectedContactRequestId(request.id)}
                      className={[
                        "w-full rounded-[24px] border p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                        selected ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white hover:border-orange-200"
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-neutral-950">{request.name}</div>
                          <div className="mt-1 text-sm text-neutral-600">{request.email}</div>
                        </div>
                        <span
                          className={[
                            "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                            request.read
                              ? "border-neutral-200 bg-neutral-100 text-neutral-600"
                              : "border-orange-200 bg-orange-50 text-ember"
                          ].join(" ")}
                        >
                          {request.read ? "Read" : "Unread"}
                        </span>
                      </div>
                      <div className="mt-2 text-sm text-neutral-700">{request.phone}</div>
                      <div className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-600">{request.message}</div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
              {contactRequestDraft ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Selected contact request</div>
                      <h3 className="mt-3 text-2xl font-semibold text-neutral-950">{contactRequestDraft.name}</h3>
                    </div>
                    <label className="inline-flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={contactRequestDraft.read}
                        onChange={(event) => handleContactRequestField("read", event.target.checked)}
                      />
                      Mark as read
                    </label>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className={labelClassName}>Name</span>
                      <input
                        value={contactRequestDraft.name}
                        onChange={(event) => handleContactRequestField("name", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Phone</span>
                      <input
                        value={contactRequestDraft.phone}
                        onChange={(event) => handleContactRequestField("phone", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Email</span>
                      <input
                        value={contactRequestDraft.email}
                        onChange={(event) => handleContactRequestField("email", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Message</span>
                      <textarea
                        value={contactRequestDraft.message}
                        onChange={(event) => handleContactRequestField("message", event.target.value)}
                        className={areaClassName}
                      />
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleSaveContactRequest()}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-[14px] bg-neutral-950 px-5 text-sm font-medium text-white"
                    >
                      Save contact request
                    </button>
                  </div>

                  {contactRequestMessage && <div className="mt-4 text-sm text-neutral-600">{contactRequestMessage}</div>}
                </>
              ) : (
                <div className="text-sm leading-6 text-neutral-600">Select a contact request to review it.</div>
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
              Update every section from forms instead of editing raw JSON.
            </div>
          </div>

          <div className="mt-6 space-y-5 rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Header and contact modal</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Contact button label</span>
                  <input
                    value={contentDraft.navigation.contactButtonLabel}
                    onChange={(event) => handleContentField("navigation", "contactButtonLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Contact email</span>
                  <input
                    value={contentDraft.navigation.contactEmail}
                    onChange={(event) => handleContentField("navigation", "contactEmail", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Modal eyebrow</span>
                  <input
                    value={contentDraft.navigation.contactModalEyebrow}
                    onChange={(event) => handleContentField("navigation", "contactModalEyebrow", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Modal submit label</span>
                  <input
                    value={contentDraft.navigation.contactModalSubmitLabel}
                    onChange={(event) => handleContentField("navigation", "contactModalSubmitLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Modal title</span>
                  <input
                    value={contentDraft.navigation.contactModalTitle}
                    onChange={(event) => handleContentField("navigation", "contactModalTitle", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>WhatsApp button label</span>
                  <input
                    value={contentDraft.navigation.whatsappLabel}
                    onChange={(event) => handleContentField("navigation", "whatsappLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Email button label</span>
                  <input
                    value={contentDraft.navigation.emailLabel}
                    onChange={(event) => handleContentField("navigation", "emailLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Hero</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Eyebrow</span>
                  <input
                    value={contentDraft.hero.eyebrow}
                    onChange={(event) => handleContentField("hero", "eyebrow", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Book button label</span>
                  <input
                    value={contentDraft.hero.bookButtonLabel}
                    onChange={(event) => handleContentField("hero", "bookButtonLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Title</span>
                  <input
                    value={contentDraft.hero.title}
                    onChange={(event) => handleContentField("hero", "title", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Copy</span>
                  <textarea
                    value={contentDraft.hero.copy}
                    onChange={(event) => handleContentField("hero", "copy", event.target.value)}
                    className={areaClassName}
                  />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Background image / CSS background</span>
                  <textarea
                    value={contentDraft.hero.backgroundImage}
                    onChange={(event) => handleContentField("hero", "backgroundImage", event.target.value)}
                    className={areaClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Track button label</span>
                  <input
                    value={contentDraft.hero.trackButtonLabel}
                    onChange={(event) => handleContentField("hero", "trackButtonLabel", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Services</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Eyebrow</span>
                  <input value={contentDraft.services.eyebrow} onChange={(event) => handleContentField("services", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Title</span>
                  <input value={contentDraft.services.title} onChange={(event) => handleContentField("services", "title", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Copy</span>
                  <textarea value={contentDraft.services.copy} onChange={(event) => handleContentField("services", "copy", event.target.value)} className={areaClassName} />
                </label>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {contentDraft.services.cards.map((card, index) => (
                  <div key={`${card.title}-${index}`} className="rounded-[20px] border border-black/8 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Service card {index + 1}</div>
                    <div className="mt-3 space-y-4">
                      <label>
                        <span className={labelClassName}>Title</span>
                        <input value={card.title} onChange={(event) => handleCardField("services", index, "title", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Icon key</span>
                        <input value={card.icon} onChange={(event) => handleCardField("services", index, "icon", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Image / CSS background</span>
                        <textarea value={card.image ?? ""} onChange={(event) => handleCardField("services", index, "image", event.target.value)} className={areaClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={card.copy} onChange={(event) => handleCardField("services", index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Why choose us</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Eyebrow</span>
                  <input value={contentDraft.whyUs.eyebrow} onChange={(event) => handleContentField("whyUs", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Title</span>
                  <input value={contentDraft.whyUs.title} onChange={(event) => handleContentField("whyUs", "title", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Copy</span>
                  <textarea value={contentDraft.whyUs.copy} onChange={(event) => handleContentField("whyUs", "copy", event.target.value)} className={areaClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Section image / CSS background</span>
                  <textarea value={contentDraft.whyUs.image} onChange={(event) => handleContentField("whyUs", "image", event.target.value)} className={areaClassName} />
                </label>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {contentDraft.whyUs.points.map((point, index) => (
                  <div key={`${point.title}-${index}`} className="rounded-[20px] border border-black/8 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Why us card {index + 1}</div>
                    <div className="mt-3 space-y-4">
                      <label>
                        <span className={labelClassName}>Title</span>
                        <input value={point.title} onChange={(event) => handleCardField("whyUs", index, "title", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Icon key</span>
                        <input value={point.icon} onChange={(event) => handleCardField("whyUs", index, "icon", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={point.copy} onChange={(event) => handleCardField("whyUs", index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">How it works</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Eyebrow</span>
                  <input value={contentDraft.process.eyebrow} onChange={(event) => handleContentField("process", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Title</span>
                  <input value={contentDraft.process.title} onChange={(event) => handleContentField("process", "title", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Copy</span>
                  <textarea value={contentDraft.process.copy} onChange={(event) => handleContentField("process", "copy", event.target.value)} className={areaClassName} />
                </label>
              </div>
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
                {contentDraft.process.steps.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="rounded-[20px] border border-black/8 bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Process step {index + 1}</div>
                    <div className="mt-3 space-y-4">
                      <label>
                        <span className={labelClassName}>Title</span>
                        <input value={step.title} onChange={(event) => handleProcessStepField(index, "title", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Icon key</span>
                        <input value={step.icon} onChange={(event) => handleProcessStepField(index, "icon", event.target.value)} className={fieldClassName} />
                      </label>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={step.copy} onChange={(event) => handleProcessStepField(index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[22px] border border-black/8 bg-[#fcfaf7] p-5">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Contact CTA and customer pages</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>CTA eyebrow</span>
                  <input value={contentDraft.contactCta.eyebrow} onChange={(event) => handleContentField("contactCta", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>CTA primary label</span>
                  <input value={contentDraft.contactCta.primaryLabel} onChange={(event) => handleContentField("contactCta", "primaryLabel", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>CTA title</span>
                  <input value={contentDraft.contactCta.title} onChange={(event) => handleContentField("contactCta", "title", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>CTA copy</span>
                  <textarea value={contentDraft.contactCta.copy} onChange={(event) => handleContentField("contactCta", "copy", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>CTA secondary label</span>
                  <input value={contentDraft.contactCta.secondaryLabel} onChange={(event) => handleContentField("contactCta", "secondaryLabel", event.target.value)} className={fieldClassName} />
                </label>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Customer eyebrow</span>
                  <input value={contentDraft.customerPages.eyebrow} onChange={(event) => handleContentField("customerPages", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Book page title</span>
                  <input value={contentDraft.customerPages.bookTitle} onChange={(event) => handleContentField("customerPages", "bookTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Book page copy</span>
                  <textarea value={contentDraft.customerPages.bookCopy} onChange={(event) => handleContentField("customerPages", "bookCopy", event.target.value)} className={areaClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Book helper</span>
                  <textarea value={contentDraft.customerPages.bookHelper} onChange={(event) => handleContentField("customerPages", "bookHelper", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Track page title</span>
                  <input value={contentDraft.customerPages.trackTitle} onChange={(event) => handleContentField("customerPages", "trackTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Track page copy</span>
                  <textarea value={contentDraft.customerPages.trackCopy} onChange={(event) => handleContentField("customerPages", "trackCopy", event.target.value)} className={areaClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Track helper</span>
                  <textarea value={contentDraft.customerPages.trackHelper} onChange={(event) => handleContentField("customerPages", "trackHelper", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Contact section title</span>
                  <input value={contentDraft.customerPages.contactTitle} onChange={(event) => handleContentField("customerPages", "contactTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Contact section copy</span>
                  <textarea value={contentDraft.customerPages.contactCopy} onChange={(event) => handleContentField("customerPages", "contactCopy", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Payment section title</span>
                  <input value={contentDraft.customerPages.paymentTitle} onChange={(event) => handleContentField("customerPages", "paymentTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Payment section copy</span>
                  <textarea value={contentDraft.customerPages.paymentCopy} onChange={(event) => handleContentField("customerPages", "paymentCopy", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Transfer title</span>
                  <input value={contentDraft.customerPages.transferTitle} onChange={(event) => handleContentField("customerPages", "transferTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Transfer copy</span>
                  <textarea value={contentDraft.customerPages.transferCopy} onChange={(event) => handleContentField("customerPages", "transferCopy", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Paystack title</span>
                  <input value={contentDraft.customerPages.paystackTitle} onChange={(event) => handleContentField("customerPages", "paystackTitle", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>Paystack copy</span>
                  <textarea value={contentDraft.customerPages.paystackCopy} onChange={(event) => handleContentField("customerPages", "paystackCopy", event.target.value)} className={areaClassName} />
                </label>
              </div>

              <div className="mt-6 rounded-[20px] border border-black/8 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Booking step labels</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <label>
                    <span className={labelClassName}>Route</span>
                    <input value={contentDraft.customerPages.stepLabels.route} onChange={(event) => handleStepLabelField("route", event.target.value)} className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Shipment</span>
                    <input value={contentDraft.customerPages.stepLabels.shipment} onChange={(event) => handleStepLabelField("shipment", event.target.value)} className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Delivery</span>
                    <input value={contentDraft.customerPages.stepLabels.delivery} onChange={(event) => handleStepLabelField("delivery", event.target.value)} className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Contact</span>
                    <input value={contentDraft.customerPages.stepLabels.contact} onChange={(event) => handleStepLabelField("contact", event.target.value)} className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Payment</span>
                    <input value={contentDraft.customerPages.stepLabels.payment} onChange={(event) => handleStepLabelField("payment", event.target.value)} className={fieldClassName} />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
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
