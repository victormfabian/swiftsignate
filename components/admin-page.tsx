"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthSession } from "@/components/auth-session";
import { ConsoleShell } from "@/components/console-shell";
import {
  type PartnerAccount,
  previewTrackingNumber,
  type ContactRequest,
  type PaymentRequest,
  type Shipment,
  type ShipmentStatus,
  useShipmentStore
} from "@/components/shipment-store";
import { type ContentCard, type SiteContent, useSiteContentStore } from "@/components/site-content-store";
import { builtInIconKeys, resolveMediaSource } from "@/lib/media-utils";
import { defaultBookingConfig } from "@/lib/site-content-model";
import { normalizeTrackingNumber } from "@/lib/shipment-model";

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
    case "Inquiry received":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "Quote sent":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "Payment submitted":
    case "Awaiting verification":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Rejected":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-neutral-100 text-neutral-600 border-neutral-200";
  }
}

const panelClassName =
  "rounded-[28px] bg-white/84 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm md:p-7";
const fieldClassName =
  "h-11 w-full rounded-[14px] border border-black/6 bg-white px-4 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
const areaClassName =
  "min-h-[120px] w-full rounded-[18px] border border-black/6 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-orange-300 focus:ring-4 focus:ring-orange-100";
const labelClassName = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500";
const selectionPanelClassName = "rounded-[24px] bg-[#f7f4ef] p-4";
const detailPanelClassName = "rounded-[24px] bg-white p-5 shadow-[0_14px_30px_rgba(15,23,42,0.05)] md:p-6";
const actionPrimaryClassName =
  "inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-ember px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(249,115,22,0.18)]";
const actionSecondaryClassName =
  "inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-white px-5 text-sm font-medium text-neutral-700 shadow-[0_8px_20px_rgba(15,23,42,0.05)]";
const actionDangerClassName =
  "inline-flex min-h-[48px] items-center justify-center rounded-[14px] bg-red-50 px-5 text-sm font-medium text-red-700";
const removeButtonClassName =
  "inline-flex min-h-[42px] items-center justify-center rounded-[12px] bg-red-50 px-4 text-sm font-medium text-red-700 transition-colors hover:bg-red-100";

type MetricCardProps = {
  label: string;
  value: string;
  detail: string;
  delay?: number;
};

type AdminWorkspaceTab = "home" | "contact" | "partners" | "booking" | "request" | "tracking" | "content";
type AdminSectionLink = {
  id: string;
  label: string;
  detail: string;
};

function MetricCard({ label, value, detail, delay = 0 }: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="rounded-[24px] bg-white/78 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)] backdrop-blur-sm"
    >
      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-neutral-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-neutral-600">{detail}</div>
    </motion.div>
  );
}

function MediaPreview({
  value,
  title,
  compact = false
}: {
  value?: string;
  title: string;
  compact?: boolean;
}) {
  const media = resolveMediaSource(value);
  const frameClassName = compact
    ? "mt-3 overflow-hidden rounded-[18px] border border-black/8 bg-white"
    : "mt-3 overflow-hidden rounded-[20px] border border-black/8 bg-white";
  const heightClassName = compact ? "h-36" : "h-44";

  if (media.kind === "empty") {
    return (
      <div className={`${frameClassName} ${heightClassName} flex items-center justify-center text-sm text-neutral-400`}>
        No media selected
      </div>
    );
  }

  if (media.kind === "image" || media.kind === "css") {
    return (
      <div
        className={`${frameClassName} ${heightClassName} bg-cover bg-center`}
        style={{ backgroundImage: media.kind === "css" ? media.src : `url("${media.src.replace(/"/g, '\\"')}")` }}
      />
    );
  }

  if (media.kind === "video") {
    return (
      <div className={`${frameClassName} ${heightClassName}`}>
        <video src={media.src} className="h-full w-full object-cover" controls playsInline />
      </div>
    );
  }

  if (media.kind === "audio") {
    return (
      <div className={`${frameClassName} ${heightClassName} flex flex-col items-center justify-center gap-4 px-4 py-5`}>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{media.label}</div>
        <audio controls className="w-full">
          <source src={media.src} />
        </audio>
      </div>
    );
  }

  if (media.kind === "pdf") {
    return (
      <div className={`${frameClassName} ${heightClassName}`}>
        <iframe src={media.src} title={title} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={`${frameClassName} ${heightClassName} flex flex-col items-center justify-center gap-4 px-4 py-5`}>
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-black/10 bg-[#fcfaf7] text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
        {media.label}
      </div>
      <a
        href={media.src}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-ember underline decoration-orange-200 underline-offset-4"
      >
        Open file
      </a>
    </div>
  );
}

type MediaFieldProps = {
  label: string;
  title: string;
  value?: string;
  onChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  compact?: boolean;
};

function MediaField({
  label,
  title,
  value,
  onChange,
  onUpload,
  placeholder = "Paste a media URL or upload a file",
  compact = false
}: MediaFieldProps) {
  return (
    <div>
      {label ? <span className={labelClassName}>{label}</span> : null}
      <div className="flex flex-col gap-3">
        <input
          value={value ?? ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={fieldClassName}
        />
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950">
            Upload file
            <input type="file" accept="*/*" className="hidden" onChange={onUpload} />
          </label>
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-600 transition-colors hover:border-orange-300 hover:text-neutral-950"
          >
            Clear
          </button>
        </div>
      </div>
      <MediaPreview value={value} title={title} compact={compact} />
    </div>
  );
}

type IconFieldProps = {
  label: string;
  title: string;
  value: string;
  fallbackValue: string;
  onChange: (value: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

function IconField({ label, title, value, fallbackValue, onChange, onUpload }: IconFieldProps) {
  const hasUploadedMedia = value.trim() !== "" && !builtInIconKeys.includes(value as (typeof builtInIconKeys)[number]);

  return (
    <div>
      <span className={labelClassName}>{label}</span>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <select
          value={hasUploadedMedia ? "__uploaded__" : value}
          onChange={(event) => {
            if (event.target.value === "__uploaded__") {
              return;
            }

            onChange(event.target.value);
          }}
          className={fieldClassName}
        >
          {builtInIconKeys.map((iconKey) => (
            <option key={iconKey} value={iconKey}>
              {iconKey}
            </option>
          ))}
          <option value="__uploaded__">Uploaded media</option>
        </select>
        <label className="inline-flex min-h-[42px] cursor-pointer items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950">
          Upload
          <input type="file" accept="*/*" className="hidden" onChange={onUpload} />
        </label>
        <button
          type="button"
          onClick={() => onChange(fallbackValue)}
          className="inline-flex min-h-[42px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-600 transition-colors hover:border-orange-300 hover:text-neutral-950"
        >
          Reset
        </button>
      </div>
      <MediaPreview value={hasUploadedMedia ? value : ""} title={title} compact />
    </div>
  );
}

function cloneContent(content: SiteContent) {
  return JSON.parse(JSON.stringify(content)) as SiteContent;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function createStoredPackageEntry(seed: string) {
  return {
    id: `package-${seed}`,
    weight: "",
    length: "",
    width: "",
    height: ""
  };
}

function resizeStoredPackages<
  T extends {
    id: string;
    weight: string;
    length: string;
    width: string;
    height: string;
  }
>(packages: T[], nextCount: number) {
  const safeCount = Math.max(1, Number.isFinite(nextCount) ? nextCount : packages.length || 1);

  if (packages.length === safeCount) {
    return packages;
  }

  if (packages.length > safeCount) {
    return packages.slice(0, safeCount);
  }

  const nextPackages = [...packages];

  for (let index = packages.length; index < safeCount; index += 1) {
    nextPackages.push(createStoredPackageEntry(`${Date.now()}-${index}`) as T);
  }

  return nextPackages;
}

function formatPackageSummary(packageCount: number, packagingType: string) {
  const normalizedPackaging = packagingType.trim().toLowerCase();

  if (!normalizedPackaging) {
    return `${packageCount} ${packageCount === 1 ? "package" : "packages"}`;
  }

  return `${packageCount} ${normalizedPackaging}`;
}

function formatEtaSummary(etaHeadline: string, etaDetail: string) {
  return [etaHeadline.trim(), etaDetail.trim()].filter(Boolean).join(", ");
}

function requestStatusPriority(status: PaymentRequest["status"]) {
  switch (status) {
    case "Payment submitted":
    case "Awaiting verification":
      return 0;
    case "Inquiry received":
      return 1;
    case "Quote sent":
      return 2;
    case "Approved":
      return 3;
    case "Rejected":
      return 4;
    default:
      return 5;
  }
}

function toNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateChargeableWeight(details: NonNullable<PaymentRequest["details"]>, content: SiteContent) {
  const weightMultiplier = details.shipment.weightUnit === "lb" ? 0.45359237 : 1;
  const dimensionMultiplier = details.shipment.dimensionUnit === "in" ? 2.54 : 1;
  const totalActualWeight = details.shipment.packages.reduce((sum, entry) => sum + Math.max(toNumber(entry.weight) * weightMultiplier, 0), 0);
  const totalVolumetricWeight = details.shipment.packages.reduce((sum, entry) => {
    const lengthValue = toNumber(entry.length);
    const widthValue = toNumber(entry.width);
    const heightValue = toNumber(entry.height);

    if (!lengthValue || !widthValue || !heightValue) {
      return sum;
    }

    const length = Math.max(lengthValue * dimensionMultiplier, 1);
    const width = Math.max(widthValue * dimensionMultiplier, 1);
    const height = Math.max(heightValue * dimensionMultiplier, 1);
    return sum + (length * width * height) / Math.max(content.bookingConfig.pricing.volumetricDivisor || 5000, 1);
  }, 0);

  return Math.max(
    totalActualWeight,
    totalVolumetricWeight,
    content.bookingConfig.pricing.minimumChargeableWeight || 0
  );
}

function applyRequestQuoteComputation(request: PaymentRequest, content: SiteContent) {
  if (!request.details?.selectedQuote) {
    return syncPaymentRequestDraftDetails(request);
  }

  const quote = request.details.selectedQuote;
  const packageCount = request.details.shipment.packages.length;
  const chargeableWeight = calculateChargeableWeight(request.details, content);
  const baseWeightAmount = chargeableWeight * (quote.ratePerKg ?? 0);
  const serviceFee = quote.serviceFee ?? 0;
  const packagingFee = quote.packagingFee ?? 0;
  const liabilityFee = request.details.shipment.higherLiability ? quote.liabilityFee ?? 0 : 0;
  const quantityFee = Math.max(packageCount - 1, 0) * (quote.extraPackageFee ?? 0);
  const finalPrice = Number((baseWeightAmount + serviceFee + packagingFee + liabilityFee + quantityFee).toFixed(2));

  return syncPaymentRequestDraftDetails({
    ...request,
    details: {
      ...request.details,
      selectedQuote: {
        ...quote,
        price: finalPrice
      }
    },
    amount: finalPrice
  });
}

function syncShipmentDraftDetails(shipment: Shipment) {
  const next = {
    ...shipment,
    ref: normalizeTrackingNumber(shipment.ref)
  };

  if (!next.details) {
    return next;
  }

  const packageCount = next.details.shipment.packages.length;
  const quote = next.details.selectedQuote;
  const routeOrigin = [next.details.route.fromCity.trim(), next.details.route.fromCountry.trim()].filter(Boolean).join(", ");
  const routeDestination = [next.details.route.toCity.trim(), next.details.route.toCountry.trim()].filter(Boolean).join(", ");

  return {
    ...next,
    origin: routeOrigin || next.origin,
    destination: routeDestination || next.destination,
    eta: quote ? formatEtaSummary(quote.etaHeadline, quote.etaDetail) || next.eta : next.eta,
    packageType:
      packageCount > 0
        ? formatPackageSummary(packageCount, next.details.shipment.packagingType)
        : next.packageType
  };
}

function syncPaymentRequestDraftDetails(request: PaymentRequest) {
  const next = {
    ...request
  };

  if (!next.details) {
    return next;
  }

  const packageCount = next.details.shipment.packages.length;
  const quote = next.details.selectedQuote;
  const routeOrigin = [next.details.route.fromCity.trim(), next.details.route.fromCountry.trim()].filter(Boolean).join(", ");
  const routeDestination = [next.details.route.toCity.trim(), next.details.route.toCountry.trim()].filter(Boolean).join(", ");

  return {
    ...next,
    origin: routeOrigin || next.origin,
    destination: routeDestination || next.destination,
    eta: quote ? formatEtaSummary(quote.etaHeadline, quote.etaDetail) || next.eta : next.eta,
    packageType:
      packageCount > 0
        ? formatPackageSummary(packageCount, next.details.shipment.packagingType)
        : next.packageType,
    serviceTitle: quote?.title?.trim() ? quote.title : next.serviceTitle,
    amount: quote && Number.isFinite(quote.price) ? quote.price : next.amount
  };
}

export function AdminPage() {
  const {
    shipments,
    paymentRequests,
    partnerAccounts,
    customerUpdates,
    contactRequests,
    nextSequence,
    approvePaymentRequest,
    sendPaymentRequestQuote,
    approvePartnerAccount,
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
        const priorityDifference = requestStatusPriority(left.status) - requestStatusPriority(right.status);

        if (priorityDifference === 0) {
          return right.createdAt.localeCompare(left.createdAt);
        }

        return priorityDifference;
      }),
    [paymentRequests]
  );
  const pendingTransfers = requestRecords.filter((request) => ["Payment submitted", "Awaiting verification"].includes(request.status));
  const pendingPartners = partnerAccounts.filter((partner) => partner.status === "pending");

  const [selectedShipmentRef, setSelectedShipmentRef] = useState("");
  const [shipmentDraft, setShipmentDraft] = useState<Shipment | null>(null);
  const [selectedRequestId, setSelectedRequestId] = useState("");
  const [requestDraft, setRequestDraft] = useState<PaymentRequest | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [shipmentMessage, setShipmentMessage] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [partnerMessage, setPartnerMessage] = useState("");
  const [contentDraft, setContentDraft] = useState<SiteContent>(cloneContent(content));
  const [contentMessage, setContentMessage] = useState("");
  const [selectedContactRequestId, setSelectedContactRequestId] = useState("");
  const [contactRequestDraft, setContactRequestDraft] = useState<ContactRequest | null>(null);
  const [contactRequestMessage, setContactRequestMessage] = useState("");
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<AdminWorkspaceTab>("home");
  const [activeWorkspaceSection, setActiveWorkspaceSection] = useState("home-overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);

  useEffect(() => {
    if (!selectedShipmentRef && shipments.length > 0) {
      setSelectedShipmentRef(shipments[0].ref);
    }
  }, [shipments, selectedShipmentRef]);

  useEffect(() => {
    if (!selectedRequestId && requestRecords.length > 0) {
      const preferred = requestRecords.find((request) => ["Payment submitted", "Awaiting verification"].includes(request.status)) ?? requestRecords[0];
      setSelectedRequestId(preferred.id);
    }
  }, [requestRecords, selectedRequestId]);

  useEffect(() => {
    if (!selectedPartnerId && partnerAccounts.length > 0) {
      setSelectedPartnerId((pendingPartners[0] ?? partnerAccounts[0]).id);
    }
  }, [partnerAccounts, pendingPartners, selectedPartnerId]);

  useEffect(() => {
    if (!selectedContactRequestId && contactRequests.length > 0) {
      setSelectedContactRequestId(contactRequests[0].id);
    }
  }, [contactRequests, selectedContactRequestId]);

  useEffect(() => {
    const nextShipment = shipments.find((shipment) => shipment.ref === selectedShipmentRef) ?? null;
    setShipmentDraft(nextShipment ? (JSON.parse(JSON.stringify(nextShipment)) as Shipment) : null);
  }, [selectedShipmentRef, shipments]);

  useEffect(() => {
    const nextRequest = requestRecords.find((request) => request.id === selectedRequestId) ?? null;
    setRequestDraft(nextRequest ? applyRequestQuoteComputation(JSON.parse(JSON.stringify(nextRequest)) as PaymentRequest, contentDraft) : null);
  }, [selectedRequestId, requestRecords, contentDraft]);

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
    contactRequests: contactRequests.filter((request) => !request.read).length,
    pendingPartners: pendingPartners.length
  };

  const workspaceTabs: Array<{ id: AdminWorkspaceTab; label: string; detail: string }> = [
    {
      id: "home",
      label: "Home",
      detail: "Overview"
    },
    {
      id: "contact",
      label: "Contact",
      detail: `${contactRequests.length} messages`
    },
    {
      id: "partners",
      label: "Partners",
      detail: `${pendingPartners.length} pending`
    },
    {
      id: "booking",
      label: "Booking",
      detail: "Options and locations"
    },
    {
      id: "request",
      label: "Request",
      detail: `${requestRecords.length} shipment requests`
    },
    {
      id: "tracking",
      label: "Tracking",
      detail: `${shipments.length} records`
    },
    {
      id: "content",
      label: "Content editor",
      detail: "Website copy and media"
    }
  ];
  const workspaceSections: Record<AdminWorkspaceTab, AdminSectionLink[]> = {
    home: [
      { id: "home-overview", label: "Overview", detail: "A quick view of requests, partners, contacts, and tracking" }
    ],
    contact: [
      { id: "contacts-list", label: "Messages", detail: "All website contact form submissions" },
      { id: "contacts-details", label: "Message details", detail: "Read and update a single message" }
    ],
    partners: [
      { id: "partners-list", label: "Partner approvals", detail: "Approve registered businesses" },
      { id: "partners-details", label: "Partner details", detail: "Review the business and send access" }
    ],
    booking: [
      { id: "setup-locations", label: "Locations", detail: "Manage origin and destination countries and cities" },
      { id: "setup-packaging", label: "Packaging", detail: "Packaging types, icons, and package count presets" }
    ],
    request: [
      { id: "transfers-list", label: "Shipment requests", detail: "Inquiry, quote, contact, and payment proof" },
      { id: "transfers-details", label: "Request details", detail: "Set price, send quote, and approve payment" },
    ],
    tracking: [
      { id: "shipments-list", label: "Shipment records", detail: "Tracking numbers, updates, and invoices" },
      { id: "shipments-details", label: "Shipment details", detail: "Update route, status, timeline, and fees" },
    ],
    content: [
      { id: "content-header", label: "Header and contact", detail: "Logo and contact modal" },
      { id: "content-hero", label: "Hero", detail: "Main banner and buttons" },
      { id: "content-services", label: "Services", detail: "Service cards and media" },
      { id: "content-why-us", label: "Why choose us", detail: "Trust section" },
      { id: "content-process", label: "How it works", detail: "Process steps" },
      { id: "content-footer", label: "Footer", detail: "Footer social links" },
      { id: "content-customer-pages", label: "Customer pages", detail: "Booking, tracking, and payment copy" }
    ]
  };
  const activeWorkspaceMeta = workspaceTabs.find((tab) => tab.id === activeWorkspaceTab) ?? workspaceTabs[0];
  const activeSectionLinks = workspaceSections[activeWorkspaceTab];
  const activeSectionMeta = activeSectionLinks.find((section) => section.id === activeWorkspaceSection) ?? activeSectionLinks[0];
  const selectedPartner = partnerAccounts.find((partner) => partner.id === selectedPartnerId) ?? pendingPartners[0] ?? partnerAccounts[0] ?? null;

  useEffect(() => {
    setActiveWorkspaceSection(workspaceSections[activeWorkspaceTab][0]?.id ?? "");
  }, [activeWorkspaceTab]);

  const isSectionVisible = (sectionId: string) => activeWorkspaceSection === sectionId;

  const handleShipmentField = <K extends keyof Shipment>(field: K, value: Shipment[K]) => {
    setShipmentDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [field]: field === "ref" ? normalizeTrackingNumber(String(value)) : value
      };
    });
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

  const handleBookingPricingField = (
    field: keyof SiteContent["bookingConfig"]["pricing"],
    value: number
  ) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        pricing: {
          ...current.bookingConfig.pricing,
          [field]: value
        }
      }
    }));
  };

  const handleBookingCountryField = (
    index: number,
    field: keyof SiteContent["bookingConfig"]["routeCountries"][number],
    value: string | boolean | number | string[]
  ) => {
    setContentDraft((current) => {
      const routeCountries = [...current.bookingConfig.routeCountries];
      routeCountries[index] = {
        ...routeCountries[index],
        [field]: value
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          routeCountries
        }
      };
    });
  };

  const handleBookingCountryCityField = (countryIndex: number, cityIndex: number, value: string) => {
    setContentDraft((current) => {
      const routeCountries = [...current.bookingConfig.routeCountries];
      const cities = [...routeCountries[countryIndex].cities];
      cities[cityIndex] = value;
      routeCountries[countryIndex] = {
        ...routeCountries[countryIndex],
        cities
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          routeCountries
        }
      };
    });
  };

  const addBookingCountry = () => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        routeCountries: [
          ...current.bookingConfig.routeCountries,
          {
            name: "",
            featuredForPickup: false,
            featuredForDestination: false,
            cities: [""]
          }
        ]
      }
    }));
  };

  const removeBookingCountry = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        routeCountries:
          current.bookingConfig.routeCountries.length > 1
            ? current.bookingConfig.routeCountries.filter((_, itemIndex) => itemIndex !== index)
            : current.bookingConfig.routeCountries
      }
    }));
  };

  const addBookingCountryCity = (countryIndex: number) => {
    setContentDraft((current) => {
      const routeCountries = [...current.bookingConfig.routeCountries];
      routeCountries[countryIndex] = {
        ...routeCountries[countryIndex],
        cities: [...routeCountries[countryIndex].cities, ""]
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          routeCountries
        }
      };
    });
  };

  const removeBookingCountryCity = (countryIndex: number, cityIndex: number) => {
    setContentDraft((current) => {
      const routeCountries = [...current.bookingConfig.routeCountries];
      const cities = routeCountries[countryIndex].cities.length > 1
        ? routeCountries[countryIndex].cities.filter((_, itemIndex) => itemIndex !== cityIndex)
        : routeCountries[countryIndex].cities;
      routeCountries[countryIndex] = {
        ...routeCountries[countryIndex],
        cities
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          routeCountries
        }
      };
    });
  };

  const handleRouteRateField = (
    index: number,
    field: keyof SiteContent["bookingConfig"]["routeRates"][number],
    value: string | number
  ) => {
    setContentDraft((current) => {
      const routeRates = [...current.bookingConfig.routeRates];
      routeRates[index] = {
        ...routeRates[index],
        [field]: value
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          routeRates
        }
      };
    });
  };

  const addRouteRate = () => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        routeRates: [
          ...current.bookingConfig.routeRates,
          {
            id: `route-rate-${current.bookingConfig.routeRates.length + 1}`,
            fromCountry: current.bookingConfig.routeCountries[0]?.name ?? "",
            fromCity: "",
            toCountry: current.bookingConfig.routeCountries[1]?.name ?? "",
            toCity: "",
            deliveryOptionId: current.bookingConfig.deliveryOptions[0]?.id ?? "",
            ratePerKg: 0,
            minimumTotal: 0
          }
        ]
      }
    }));
  };

  const removeRouteRate = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        routeRates:
          current.bookingConfig.routeRates.length > 1
            ? current.bookingConfig.routeRates.filter((_, itemIndex) => itemIndex !== index)
            : current.bookingConfig.routeRates
      }
    }));
  };

  const handlePackageCountSuggestion = (index: number, value: number) => {
    setContentDraft((current) => {
      const packageCountSuggestions = [...current.bookingConfig.packageCountSuggestions];
      packageCountSuggestions[index] = value;

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          packageCountSuggestions
        }
      };
    });
  };

  const addPackageCountSuggestion = () => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        packageCountSuggestions: [...current.bookingConfig.packageCountSuggestions, current.bookingConfig.packageCountSuggestions.length + 1]
      }
    }));
  };

  const removePackageCountSuggestion = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        packageCountSuggestions:
          current.bookingConfig.packageCountSuggestions.length > 1
            ? current.bookingConfig.packageCountSuggestions.filter((_, itemIndex) => itemIndex !== index)
            : current.bookingConfig.packageCountSuggestions
      }
    }));
  };

  const handlePackagingOptionField = (
    index: number,
    field: keyof SiteContent["bookingConfig"]["packagingOptions"][number],
    value: string | number
  ) => {
    setContentDraft((current) => {
      const packagingOptions = [...current.bookingConfig.packagingOptions];
      packagingOptions[index] = {
        ...packagingOptions[index],
        [field]: value
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          packagingOptions
        }
      };
    });
  };

  const addPackagingOption = () => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        packagingOptions: [
          ...current.bookingConfig.packagingOptions,
          {
            id: `packaging-${current.bookingConfig.packagingOptions.length + 1}`,
            label: "",
            description: "",
            icon: "delivery",
            priceAdjustment: 0
          }
        ]
      }
    }));
  };

  const removePackagingOption = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        packagingOptions:
          current.bookingConfig.packagingOptions.length > 1
            ? current.bookingConfig.packagingOptions.filter((_, itemIndex) => itemIndex !== index)
            : current.bookingConfig.packagingOptions
      }
    }));
  };

  const handleDeliveryOptionField = (
    index: number,
    field: keyof SiteContent["bookingConfig"]["deliveryOptions"][number],
    value: string | number
  ) => {
    setContentDraft((current) => {
      const deliveryOptions = [...current.bookingConfig.deliveryOptions];
      deliveryOptions[index] = {
        ...deliveryOptions[index],
        [field]: value
      };

      return {
        ...current,
        bookingConfig: {
          ...current.bookingConfig,
          deliveryOptions
        }
      };
    });
  };

  const addDeliveryOption = () => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        deliveryOptions: [
          ...current.bookingConfig.deliveryOptions,
          {
            id: `delivery-${current.bookingConfig.deliveryOptions.length + 1}`,
            title: "",
            operator: "",
            etaHeadline: "",
            etaDetail: "",
            pickupNote: "",
            priceAdjustment: 0
          }
        ]
      }
    }));
  };

  const removeDeliveryOption = (index: number) => {
    setContentDraft((current) => ({
      ...current,
      bookingConfig: {
        ...current.bookingConfig,
        deliveryOptions:
          current.bookingConfig.deliveryOptions.length > 1
            ? current.bookingConfig.deliveryOptions.filter((_, itemIndex) => itemIndex !== index)
            : current.bookingConfig.deliveryOptions
      }
    }));
  };

  const updateShipmentDetails = (
    updater: (details: NonNullable<Shipment["details"]>) => NonNullable<Shipment["details"]>
  ) => {
    setShipmentDraft((current) => {
      if (!current?.details) {
        return current;
      }

      return syncShipmentDraftDetails({
        ...current,
        details: updater(current.details)
      });
    });
  };

  const handleShipmentDetailRouteField = (
    field: keyof NonNullable<Shipment["details"]>["route"],
    value: string | boolean | null
  ) => {
    updateShipmentDetails((details) => ({
      ...details,
      route: {
        ...details.route,
        [field]: value
      }
    }));
  };

  const handleShipmentDetailShipmentField = (
    field: keyof NonNullable<Shipment["details"]>["shipment"],
    value: string | boolean | null
  ) => {
    updateShipmentDetails((details) => ({
      ...details,
      shipment: {
        ...details.shipment,
        [field]: value
      }
    }));
  };

  const handleShipmentDetailPackageCount = (value: number) => {
    updateShipmentDetails((details) => ({
      ...details,
      shipment: {
        ...details.shipment,
        packages: resizeStoredPackages(details.shipment.packages, value)
      }
    }));
  };

  const handleShipmentDetailPackageField = (
    index: number,
    field: keyof NonNullable<Shipment["details"]>["shipment"]["packages"][number],
    value: string
  ) => {
    updateShipmentDetails((details) => {
      const packages = [...details.shipment.packages];
      packages[index] = {
        ...packages[index],
        [field]: value
      };

      return {
        ...details,
        shipment: {
          ...details.shipment,
          packages
        }
      };
    });
  };

  const handleShipmentDetailQuoteField = (
    field: keyof NonNullable<NonNullable<Shipment["details"]>["selectedQuote"]>,
    value: string | number
  ) => {
    updateShipmentDetails((details) => ({
      ...details,
      selectedQuote: {
        ...details.selectedQuote,
        id: details.selectedQuote?.id ?? "custom-service",
        title: details.selectedQuote?.title ?? "",
        etaHeadline: details.selectedQuote?.etaHeadline ?? "",
        etaDetail: details.selectedQuote?.etaDetail ?? "",
        pickupNote: details.selectedQuote?.pickupNote ?? "",
        operator: details.selectedQuote?.operator ?? "",
        price: details.selectedQuote?.price ?? 0,
        ratePerKg: details.selectedQuote?.ratePerKg ?? 0,
        minimumTotal: details.selectedQuote?.minimumTotal ?? 0,
        serviceFee: details.selectedQuote?.serviceFee ?? 0,
        packagingFee: details.selectedQuote?.packagingFee ?? 0,
        liabilityFee: details.selectedQuote?.liabilityFee ?? 0,
        residentialFee: details.selectedQuote?.residentialFee ?? 0,
        extraPackageFee: details.selectedQuote?.extraPackageFee ?? 0,
        [field]: value
      }
    }));
  };

  const updateRequestDetails = (
    updater: (details: NonNullable<PaymentRequest["details"]>) => NonNullable<PaymentRequest["details"]>
  ) => {
    setRequestDraft((current) => {
      if (!current?.details) {
        return current;
      }

      return applyRequestQuoteComputation({
        ...current,
        details: updater(current.details)
      }, contentDraft);
    });
  };

  const handleRequestDetailRouteField = (
    field: keyof NonNullable<PaymentRequest["details"]>["route"],
    value: string | boolean | null
  ) => {
    updateRequestDetails((details) => ({
      ...details,
      route: {
        ...details.route,
        [field]: value
      }
    }));
  };

  const handleRequestDetailShipmentField = (
    field: keyof NonNullable<PaymentRequest["details"]>["shipment"],
    value: string | boolean | null
  ) => {
    updateRequestDetails((details) => ({
      ...details,
      shipment: {
        ...details.shipment,
        [field]: value
      }
    }));
  };

  const handleRequestDetailPackageCount = (value: number) => {
    updateRequestDetails((details) => ({
      ...details,
      shipment: {
        ...details.shipment,
        packages: resizeStoredPackages(details.shipment.packages, value)
      }
    }));
  };

  const handleRequestDetailPackageField = (
    index: number,
    field: keyof NonNullable<PaymentRequest["details"]>["shipment"]["packages"][number],
    value: string
  ) => {
    updateRequestDetails((details) => {
      const packages = [...details.shipment.packages];
      packages[index] = {
        ...packages[index],
        [field]: value
      };

      return {
        ...details,
        shipment: {
          ...details.shipment,
          packages
        }
      };
    });
  };

  const handleRequestDetailQuoteField = (
    field: keyof NonNullable<NonNullable<PaymentRequest["details"]>["selectedQuote"]>,
    value: string | number
  ) => {
    updateRequestDetails((details) => ({
      ...details,
      selectedQuote: {
        ...details.selectedQuote,
        id: details.selectedQuote?.id ?? "custom-service",
        title: details.selectedQuote?.title ?? "",
        etaHeadline: details.selectedQuote?.etaHeadline ?? "",
        etaDetail: details.selectedQuote?.etaDetail ?? "",
        pickupNote: details.selectedQuote?.pickupNote ?? "",
        operator: details.selectedQuote?.operator ?? "",
        price: details.selectedQuote?.price ?? 0,
        ratePerKg: details.selectedQuote?.ratePerKg ?? 0,
        minimumTotal: details.selectedQuote?.minimumTotal ?? 0,
        serviceFee: details.selectedQuote?.serviceFee ?? 0,
        packagingFee: details.selectedQuote?.packagingFee ?? 0,
        liabilityFee: details.selectedQuote?.liabilityFee ?? 0,
        residentialFee: details.selectedQuote?.residentialFee ?? 0,
        extraPackageFee: details.selectedQuote?.extraPackageFee ?? 0,
        [field]: value
      }
    }));
  };

  const handleRequestDetailPartyField = (
    side: "sender" | "receiver",
    field: keyof NonNullable<PaymentRequest["details"]>["sender"],
    value: string | boolean
  ) => {
    updateRequestDetails((details) => ({
      ...details,
      [side]: {
        ...details[side],
        [field]: value
      }
    }));
  };

  const handleMediaUpload = async (
    event: ChangeEvent<HTMLInputElement>,
    applyValue: (value: string) => void
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      applyValue(dataUrl);
      setContentMessage(`${file.name} is ready. Save site content to publish the uploaded media.`);
    } catch {
      setContentMessage(`Could not load ${file.name}. Try another file.`);
    }
  };

  const handleSaveShipment = async () => {
    if (!shipmentDraft || !selectedShipmentRef) {
      return;
    }

    try {
      const nextDraft = syncShipmentDraftDetails(shipmentDraft);
      await updateShipmentRecord(selectedShipmentRef, nextDraft);
      setShipmentDraft(nextDraft);
      setSelectedShipmentRef(nextDraft.ref);
      setShipmentMessage(`Shipment ${nextDraft.ref} has been updated.`);
    } catch {
      setShipmentMessage("Could not save the shipment changes.");
    }
  };

  const persistRequestDraft = async () => {
    if (!requestDraft) {
      return;
    }

    const nextDraft = applyRequestQuoteComputation(requestDraft, contentDraft);
    setRequestDraft(nextDraft);
    await updatePaymentRequest(nextDraft.id, nextDraft);
  };

  const handleSaveRequest = async () => {
    if (!requestDraft) {
      return;
    }

    try {
      setRequestDraft(applyRequestQuoteComputation(requestDraft, contentDraft));
      await persistRequestDraft();
      setRequestMessage(`Shipment request ${requestDraft.id} has been updated.`);
    } catch {
      setRequestMessage("Could not save the shipment request.");
    }
  };

  const handleSendQuote = async () => {
    if (!requestDraft) {
      return;
    }

    try {
      const nextDraft = applyRequestQuoteComputation(requestDraft, contentDraft);
      setRequestDraft(nextDraft);
      await updatePaymentRequest(requestDraft.id, nextDraft);
      const warning = await sendPaymentRequestQuote(requestDraft.id);
      setRequestMessage(
        warning ? `${warning} Request ${requestDraft.id} was still updated.` : `Quote email sent for request ${requestDraft.id}.`
      );
    } catch {
      setRequestMessage("Could not send the shipment quote email.");
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
        setRequestMessage(`Payment confirmed. The invoice and tracking number ${shipment.ref} were issued automatically.`);
        setSelectedShipmentRef(shipment.ref);
        return;
      }
    } catch {
      setRequestMessage("That shipment request could not be approved.");
      return;
    }

    setRequestMessage("That shipment request could not be approved.");
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
      setRequestMessage(`Shipment request ${requestDraft.id} was rejected and the customer was notified.`);
    } catch {
      setRequestMessage("Could not reject the shipment request.");
    }
  };

  const handleApprovePartner = async () => {
    if (!selectedPartnerId) {
      return;
    }

    try {
      const warning = await approvePartnerAccount(selectedPartnerId);
      setPartnerMessage(
        warning
          ? `${warning} The partner was still approved.`
          : "Partner account approved. If email delivery is configured, the temporary password has been sent to the business."
      );
    } catch {
      setPartnerMessage("Could not approve that partner account.");
    }
  };

  const handleSaveContent = async () => {
    try {
      await updateContent(contentDraft);
      setContentMessage("Booking setup has been updated.");
    } catch {
      setContentMessage("Could not save the booking setup right now.");
    }
  };

  const handleResetContent = async () => {
    try {
      await resetContent();
      setContentMessage("Booking setup has been reset to the default values.");
    } catch {
      setContentMessage("Could not reset the booking setup.");
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

  const renderRequestDetailsEditor = () => {
    if (!requestDraft?.details) {
      return null;
    }

    const requestChargeableWeight = calculateChargeableWeight(requestDraft.details, contentDraft);
    const packageCount = requestDraft.details.shipment.packages.length;
    const quote = requestDraft.details.selectedQuote;
    const baseWeightAmount = requestChargeableWeight * (quote?.ratePerKg ?? 0);
    const quantityFee = Math.max(packageCount - 1, 0) * (quote?.extraPackageFee ?? 0);
    const liabilityFee = requestDraft.details.shipment.higherLiability ? quote?.liabilityFee ?? 0 : 0;
    const finalAmount = quote?.price ?? requestDraft.amount;

    return (
      <div className="md:col-span-2 rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Stored booking details</div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-[18px] border border-black/8 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Packages</div>
            <div className="mt-2 text-xl font-semibold text-neutral-950">{packageCount}</div>
          </div>
          <div className="rounded-[18px] border border-black/8 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Chargeable weight</div>
            <div className="mt-2 text-xl font-semibold text-neutral-950">{requestChargeableWeight.toFixed(2)} kg</div>
          </div>
          <div className="rounded-[18px] border border-black/8 bg-white p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Weight charge</div>
            <div className="mt-2 text-xl font-semibold text-neutral-950">
              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(baseWeightAmount)}
            </div>
          </div>
          <div className="rounded-[18px] border border-orange-200 bg-orange-50/50 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Final quote</div>
            <div className="mt-2 text-xl font-semibold text-ember">
              {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(finalAmount)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClassName}>Origin country</span>
            <input value={requestDraft.details.route.fromCountry} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Origin city</span>
            <input value={requestDraft.details.route.fromCity} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Destination country</span>
            <input value={requestDraft.details.route.toCountry} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Destination city</span>
            <input value={requestDraft.details.route.toCity} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Packaging type</span>
            <input value={requestDraft.details.shipment.packagingType} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Package count</span>
            <input value={String(requestDraft.details.shipment.packages.length)} readOnly className={fieldClassName} />
          </label>
          <label>
            <span className={labelClassName}>Quoted service</span>
            <input
              value={requestDraft.details.selectedQuote?.title ?? ""}
              onChange={(event) => handleRequestDetailQuoteField("title", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Operator</span>
            <input
              value={requestDraft.details.selectedQuote?.operator ?? ""}
              onChange={(event) => handleRequestDetailQuoteField("operator", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Rate per kg</span>
            <input
              type="number"
              value={requestDraft.details.selectedQuote?.ratePerKg ?? 0}
              onChange={(event) => handleRequestDetailQuoteField("ratePerKg", Number(event.target.value) || 0)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Service fee</span>
            <input
              type="number"
              value={requestDraft.details.selectedQuote?.serviceFee ?? 0}
              onChange={(event) => handleRequestDetailQuoteField("serviceFee", Number(event.target.value) || 0)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Packaging fee</span>
            <input
              type="number"
              value={requestDraft.details.selectedQuote?.packagingFee ?? 0}
              onChange={(event) => handleRequestDetailQuoteField("packagingFee", Number(event.target.value) || 0)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Extra package fee</span>
            <input
              type="number"
              value={requestDraft.details.selectedQuote?.extraPackageFee ?? 0}
              onChange={(event) => handleRequestDetailQuoteField("extraPackageFee", Number(event.target.value) || 0)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Extra cover fee</span>
            <input
              type="number"
              value={requestDraft.details.selectedQuote?.liabilityFee ?? 0}
              onChange={(event) => handleRequestDetailQuoteField("liabilityFee", Number(event.target.value) || 0)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Timeline label</span>
            <input
              value={requestDraft.details.selectedQuote?.etaHeadline ?? ""}
              onChange={(event) => handleRequestDetailQuoteField("etaHeadline", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Timeline detail</span>
            <input
              value={requestDraft.details.selectedQuote?.etaDetail ?? ""}
              onChange={(event) => handleRequestDetailQuoteField("etaDetail", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Final quote amount</span>
            <input
              value={new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(finalAmount)}
              readOnly
              className={fieldClassName}
            />
          </label>
          <label className="md:col-span-2">
            <span className={labelClassName}>Quote note</span>
            <textarea
              value={requestDraft.details.selectedQuote?.pickupNote ?? ""}
              onChange={(event) => handleRequestDetailQuoteField("pickupNote", event.target.value)}
              className={areaClassName}
            />
          </label>
        </div>

        <div className="mt-5 rounded-[18px] border border-black/8 bg-white p-4 text-sm text-neutral-700">
          <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Quote breakdown</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <div>Weight charge: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(baseWeightAmount)}</div>
            <div>Service fee: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(quote?.serviceFee ?? 0)}</div>
            <div>Packaging fee: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(quote?.packagingFee ?? 0)}</div>
            <div>Extra package fee: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(quantityFee)}</div>
            <div>Extra cover fee: {new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(liabilityFee)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {([
            {
              side: "sender" as const,
              title: "Sender contact details",
              country: requestDraft.details.route.fromCountry
            },
            {
              side: "receiver" as const,
              title: "Receiver contact details",
              country: requestDraft.details.route.toCountry
            }
          ]).map((party) => {
            const details = requestDraft.details?.[party.side];

            return (
              <div key={party.side} className="rounded-[18px] border border-black/8 bg-white p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">{party.title}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">
                    <span className={labelClassName}>Full name</span>
                    <input value={details?.name ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelClassName}>Company</span>
                    <input value={details?.company ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Email</span>
                    <input value={details?.email ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Phone</span>
                    <input value={details?.phone ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelClassName}>Address line 1</span>
                    <input value={details?.address1 ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label className="sm:col-span-2">
                    <span className={labelClassName}>Address line 2</span>
                    <input value={details?.address2 ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>City</span>
                    <input value={details?.city ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Postal code</span>
                    <input value={details?.postalCode ?? ""} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Country</span>
                    <input value={party.country} readOnly className={fieldClassName} />
                  </label>
                  <label>
                    <span className={labelClassName}>Residential address</span>
                    <input value={details?.residential ? "Yes" : "No"} readOnly className={fieldClassName} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {requestDraft.details.shipment.packages.map((entry, index) => (
            <div key={entry.id} className="rounded-[18px] border border-black/8 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Package {index + 1}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={labelClassName}>Weight</span>
                  <input value={entry.weight} readOnly className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Length (optional)</span>
                  <input value={entry.length} readOnly className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Width (optional)</span>
                  <input value={entry.width} readOnly className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Height (optional)</span>
                  <input value={entry.height} readOnly className={fieldClassName} />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderShipmentDetailsEditor = () => {
    if (!shipmentDraft?.details) {
      return null;
    }

    return (
      <div className="mt-6 rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4">
        <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Booking details captured at checkout</div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label>
            <span className={labelClassName}>Origin country</span>
            <input
              value={shipmentDraft.details.route.fromCountry}
              onChange={(event) => handleShipmentDetailRouteField("fromCountry", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Origin city</span>
            <input
              value={shipmentDraft.details.route.fromCity}
              onChange={(event) => handleShipmentDetailRouteField("fromCity", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Destination country</span>
            <input
              value={shipmentDraft.details.route.toCountry}
              onChange={(event) => handleShipmentDetailRouteField("toCountry", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Destination city</span>
            <input
              value={shipmentDraft.details.route.toCity}
              onChange={(event) => handleShipmentDetailRouteField("toCity", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Packaging option</span>
            <input
              value={shipmentDraft.details.shipment.packagingType}
              onChange={(event) => handleShipmentDetailShipmentField("packagingType", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Package count</span>
            <input
              type="number"
              min={1}
              value={shipmentDraft.details.shipment.packages.length}
              onChange={(event) => handleShipmentDetailPackageCount(Number(event.target.value) || 1)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Quoted service</span>
            <input
              value={shipmentDraft.details.selectedQuote?.title ?? ""}
              onChange={(event) => handleShipmentDetailQuoteField("title", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Operator</span>
            <input
              value={shipmentDraft.details.selectedQuote?.operator ?? ""}
              onChange={(event) => handleShipmentDetailQuoteField("operator", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Timeline label</span>
            <input
              value={shipmentDraft.details.selectedQuote?.etaHeadline ?? ""}
              onChange={(event) => handleShipmentDetailQuoteField("etaHeadline", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label>
            <span className={labelClassName}>Timeline detail</span>
            <input
              value={shipmentDraft.details.selectedQuote?.etaDetail ?? ""}
              onChange={(event) => handleShipmentDetailQuoteField("etaDetail", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <label className="md:col-span-2">
            <span className={labelClassName}>Shipment note</span>
            <textarea
              value={shipmentDraft.details.selectedQuote?.pickupNote ?? ""}
              onChange={(event) => handleShipmentDetailQuoteField("pickupNote", event.target.value)}
              className={areaClassName}
            />
          </label>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {shipmentDraft.details.shipment.packages.map((entry, index) => (
            <div key={entry.id} className="rounded-[18px] border border-black/8 bg-white p-4">
              <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Package {index + 1}</div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className={labelClassName}>Weight (kg)</span>
                  <input
                    value={entry.weight}
                    onChange={(event) => handleShipmentDetailPackageField(index, "weight", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Length (optional)</span>
                  <input
                    value={entry.length}
                    onChange={(event) => handleShipmentDetailPackageField(index, "length", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Width (optional)</span>
                  <input
                    value={entry.width}
                    onChange={(event) => handleShipmentDetailPackageField(index, "width", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
                <label>
                  <span className={labelClassName}>Height (optional)</span>
                  <input
                    value={entry.height}
                    onChange={(event) => handleShipmentDetailPackageField(index, "height", event.target.value)}
                    className={fieldClassName}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderShipmentSetupEditor = () => {
    const countryNames = contentDraft.bookingConfig.routeCountries.map((country) => country.name).filter(Boolean);

    return (
      <div className="mt-6 space-y-5">
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Booking setup</div>
          <div className="mt-2 text-sm text-neutral-500">
            Define origin and destination locations, manage route rates, and control the packaging types shown during booking.
          </div>

          <div id="setup-locations" className={isSectionVisible("setup-locations") ? "mt-4 rounded-[20px] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Available countries and cities</div>
              <button
                type="button"
                onClick={addBookingCountry}
                className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700"
              >
                Add country
              </button>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {contentDraft.bookingConfig.routeCountries.map((country, index) => (
                <div key={`${country.name}-${index}`} className="rounded-[18px] border border-black/8 bg-[#fcfaf7] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-950">Country {index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeBookingCountry(index)}
                      className={removeButtonClassName}
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-4 grid gap-4">
                    <label>
                      <span className={labelClassName}>Country name</span>
                      <input
                        value={country.name}
                        onChange={(event) => handleBookingCountryField(index, "name", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <div>
                      <div className={labelClassName}>Available cities</div>
                      <div className="space-y-3">
                        {country.cities.map((city, cityIndex) => (
                          <div key={`${city}-${cityIndex}`} className="flex gap-3">
                            <input
                              value={city}
                              onChange={(event) => handleBookingCountryCityField(index, cityIndex, event.target.value)}
                              className={fieldClassName}
                            />
                            <button
                              type="button"
                              onClick={() => removeBookingCountryCity(index, cityIndex)}
                              className={removeButtonClassName}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addBookingCountryCity(index)}
                          className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700"
                        >
                          Add city
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={isSectionVisible("setup-locations") ? "mt-5" : "hidden"}>
            <div id="setup-pricing" className="rounded-[20px] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Route rate cards</div>
                  <div className="mt-2 text-sm text-neutral-500">Pick the route and set the cost per kg. Leave city blank to make the rate apply to the full country route. Weight entered in pounds is converted to kg automatically before pricing.</div>
                </div>
                <button
                  type="button"
                  onClick={addRouteRate}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700"
                >
                  Add rate card
                </button>
              </div>
              <div className="mt-4 space-y-4">
                {contentDraft.bookingConfig.routeRates.map((rate, index) => {
                  const fromCities = contentDraft.bookingConfig.routeCountries.find((country) => country.name === rate.fromCountry)?.cities ?? [];
                  const toCities = contentDraft.bookingConfig.routeCountries.find((country) => country.name === rate.toCountry)?.cities ?? [];

                  return (
                    <div key={`${rate.id}-${index}`} className="rounded-[18px] border border-black/8 bg-[#fcfaf7] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-neutral-950">Rate card {index + 1}</div>
                        <button
                          type="button"
                          onClick={() => removeRouteRate(index)}
                          className={removeButtonClassName}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <label>
                          <span className={labelClassName}>Origin country</span>
                          <select
                            value={rate.fromCountry}
                            onChange={(event) => handleRouteRateField(index, "fromCountry", event.target.value)}
                            className={fieldClassName}
                          >
                            <option value="">Select origin country</option>
                            {countryNames.map((countryName) => (
                              <option key={`${rate.id}-from-${countryName}`} value={countryName}>
                                {countryName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClassName}>Origin city</span>
                          <select
                            value={rate.fromCity}
                            onChange={(event) => handleRouteRateField(index, "fromCity", event.target.value)}
                            className={fieldClassName}
                          >
                            <option value="">Any city</option>
                            {fromCities.map((city) => (
                              <option key={`${rate.id}-from-city-${city}`} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClassName}>Destination country</span>
                          <select
                            value={rate.toCountry}
                            onChange={(event) => handleRouteRateField(index, "toCountry", event.target.value)}
                            className={fieldClassName}
                          >
                            <option value="">Select destination country</option>
                            {countryNames.map((countryName) => (
                              <option key={`${rate.id}-to-${countryName}`} value={countryName}>
                                {countryName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClassName}>Destination city</span>
                          <select
                            value={rate.toCity}
                            onChange={(event) => handleRouteRateField(index, "toCity", event.target.value)}
                            className={fieldClassName}
                          >
                            <option value="">Any city</option>
                            {toCities.map((city) => (
                              <option key={`${rate.id}-to-city-${city}`} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          <span className={labelClassName}>Rate per kg</span>
                          <input
                            type="number"
                            value={rate.ratePerKg}
                            onChange={(event) => handleRouteRateField(index, "ratePerKg", Number(event.target.value) || 0)}
                            className={fieldClassName}
                          />
                        </label>
                        <label>
                          <span className={labelClassName}>Minimum total</span>
                          <input
                            type="number"
                            value={rate.minimumTotal}
                            onChange={(event) => handleRouteRateField(index, "minimumTotal", Number(event.target.value) || 0)}
                            className={fieldClassName}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          <div id="setup-packaging" className={isSectionVisible("setup-packaging") ? "mt-5 space-y-5" : "hidden"}>
            <div className="rounded-[20px] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Package count presets</div>
                <button
                  type="button"
                  onClick={addPackageCountSuggestion}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700"
                >
                  Add preset
                </button>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {contentDraft.bookingConfig.packageCountSuggestions.map((count, index) => (
                  <div key={`${count}-${index}`} className="flex gap-3">
                    <input
                      type="number"
                      min={1}
                      value={count}
                      onChange={(event) => handlePackageCountSuggestion(index, Number(event.target.value) || 1)}
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      onClick={() => removePackageCountSuggestion(index)}
                      className={removeButtonClassName}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs uppercase tracking-[0.16em] text-neutral-500">Packaging types</div>
                <button
                  type="button"
                  onClick={addPackagingOption}
                  className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700"
                >
                  Add packaging type
                </button>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                {contentDraft.bookingConfig.packagingOptions.map((option, index) => (
                  <div key={`${option.id}-${index}`} className="rounded-[18px] border border-black/8 bg-[#fcfaf7] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-neutral-950">Packaging type {index + 1}</div>
                      <button
                        type="button"
                        onClick={() => removePackagingOption(index)}
                        className={removeButtonClassName}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-4 space-y-4">
                      <label>
                        <span className={labelClassName}>Display name</span>
                        <input
                          value={option.label}
                          onChange={(event) => handlePackagingOptionField(index, "label", event.target.value)}
                          className={fieldClassName}
                        />
                      </label>
                      <div>
                        <IconField
                          label="Packaging icon"
                          title={`${option.label || "Packaging"} icon`}
                          value={option.icon}
                          fallbackValue={defaultBookingConfig.packagingOptions[index]?.icon ?? "delivery"}
                          onChange={(value) => handlePackagingOptionField(index, "icon", value)}
                          onUpload={(event) => void handleMediaUpload(event, (value) => handlePackagingOptionField(index, "icon", value))}
                        />
                      </div>
                      <label>
                        <span className={labelClassName}>Customer description</span>
                        <textarea
                          value={option.description}
                          onChange={(event) => handlePackagingOptionField(index, "description", event.target.value)}
                          className={areaClassName}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContentActionBar = () => {
    return (
      <div className="sticky bottom-3 z-10 mt-6 rounded-[22px] border border-black/8 bg-white/95 p-3 shadow-[0_16px_30px_rgba(140,110,78,0.12)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleSaveContent}
            className={actionPrimaryClassName}
          >
            Save booking setup
          </button>
          <button
            type="button"
            onClick={handleResetContent}
            className={actionDangerClassName}
          >
            Reset booking setup
          </button>
        </div>
      </div>
    );
  };

  const jumpToSection = (sectionId: string, tabId: AdminWorkspaceTab = activeWorkspaceTab) => {
    setActiveWorkspaceTab(tabId);
    setActiveWorkspaceSection(sectionId || (workspaceSections[tabId][0]?.id ?? ""));
    setSidebarOpen(false);
  };

  const renderWorkspaceSidebar = () => (
      <div className="flex h-full flex-col bg-[#121922] px-5 py-6 text-white shadow-[0_24px_60px_rgba(15,23,42,0.28)] xl:rounded-r-[28px]">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">Workspace</div>
            <div className="mt-2 text-lg font-semibold text-white">Workspace menu</div>
          </div>
        <button
          type="button"
          onClick={() => setDesktopSidebarVisible(false)}
          className="hidden xl:inline-flex min-h-[38px] items-center justify-center rounded-full border border-white/12 bg-white/6 px-4 text-xs font-semibold uppercase tracking-[0.16em] text-white/72 transition-colors hover:bg-white/10"
        >
          Hide
        </button>
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {workspaceTabs.map((tab) => {
          const selected = tab.id === activeWorkspaceTab;
          const sectionLinks = workspaceSections[tab.id];

          return (
            <div key={tab.id} className="overflow-hidden rounded-[22px] bg-white/[0.03]">
              <button
                type="button"
                onClick={() => jumpToSection(sectionLinks[0]?.id ?? "", tab.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors",
                  selected ? "bg-white/[0.06]" : "hover:bg-white/[0.05]"
                ].join(" ")}
              >
                <div>
                  <div className={selected ? "text-sm font-semibold text-white" : "text-sm font-medium text-white/88"}>
                    {tab.label}
                  </div>
                  <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/42">{tab.detail}</div>
                </div>
                <svg
                  viewBox="0 0 20 20"
                  className={["h-4 w-4 transition-transform", selected ? "rotate-180 text-orange-200" : "text-white/40"].join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              <AnimatePresence initial={false}>
                {selected && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-white/8"
                  >
                    <div className="space-y-1 p-2">
                      {sectionLinks.map((section) => {
                        const sectionSelected = section.id === activeWorkspaceSection;

                        return (
                          <button
                            key={section.id}
                            type="button"
                            onClick={() => jumpToSection(section.id, tab.id)}
                            className={[
                              "w-full rounded-[16px] px-3 py-3 text-left transition-colors",
                              sectionSelected
                                ? "bg-white text-neutral-950"
                                : "text-white/78 hover:bg-white/[0.06]"
                            ].join(" ")}
                          >
                            <div className="text-sm font-medium">{section.label}</div>
                            <div className={sectionSelected ? "mt-1 text-[11px] uppercase tracking-[0.16em] text-neutral-500" : "mt-1 text-[11px] uppercase tracking-[0.16em] text-white/36"}>
                              {section.detail}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );

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
    <ConsoleShell
      active="admin"
      eyebrow="Swift Admin"
      title="Manage payments, bookings, content, and customer records"
      logoMedia={content.navigation.logoMedia}
    >
      {desktopSidebarVisible && (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[320px] xl:block">
          {renderWorkspaceSidebar()}
        </aside>
      )}

      {!desktopSidebarVisible && (
        <button
          type="button"
          onClick={() => setDesktopSidebarVisible(true)}
          className="fixed left-0 top-4 z-40 hidden h-16 items-center justify-center rounded-r-[20px] bg-[#121922] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)] xl:inline-flex"
        >
          Menu
        </button>
      )}

        <div className={["space-y-6 transition-[padding] duration-200", desktopSidebarVisible ? "xl:pl-[336px]" : "xl:pl-20"].join(" ")}>
          <div className="grid gap-4 rounded-[24px] bg-white/78 p-5 shadow-[0_16px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Admin workspace</div>
              <div className="mt-3 text-lg font-semibold text-neutral-950">Signed in as {currentAdmin?.email}</div>
              <div className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Manage partner approvals, shipment requests, live shipment records, rates, extras, and packaging from one place.
              </div>
            </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void signOut();
                window.location.href = "/swiftadmin/signin";
              }}
              className={actionSecondaryClassName}
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-[20px] bg-[#121922] p-4 text-white shadow-[0_16px_30px_rgba(15,23,42,0.18)] xl:hidden">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Current screen</div>
            <div className="mt-1 text-lg font-semibold text-white">{activeSectionMeta?.label ?? activeWorkspaceMeta.label}</div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-900"
          >
            Open menu
          </button>
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[90] bg-black/50 p-4 backdrop-blur-sm xl:hidden"
            >
              <motion.div
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="h-full max-w-sm overflow-y-auto rounded-[30px] bg-[#0f1720] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Admin menu</div>
                    <div className="mt-1 text-lg font-semibold text-white">{activeSectionMeta?.label ?? activeWorkspaceMeta.label}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/8 text-white"
                  >
                    <span className="sr-only">Close menu</span>
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                {renderWorkspaceSidebar()}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{activeWorkspaceMeta.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950">{activeSectionMeta?.label ?? activeWorkspaceMeta.label}</div>
                <div className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">{activeSectionMeta?.detail ?? activeWorkspaceMeta.detail}</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500 shadow-[0_8px_20px_rgba(15,23,42,0.05)]">
                  {activeSectionLinks.length} sections
                </div>
              </div>
            </div>

        {activeWorkspaceTab === "home" && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Admin home</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Overview of shipments, contacts, and approvals</h2>
            </div>
            <div className="text-sm text-neutral-500">
              Use this screen for a quick snapshot, then switch to another tab to manage a specific area.
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-5">
            <MetricCard
              label="Pending partners"
              value={totals.pendingPartners.toString()}
              detail="Business registrations waiting for admin approval."
            />
            <MetricCard
              label="Shipment requests"
              value={pendingTransfers.length.toString()}
              detail="Customer inquiries and payment proofs waiting for review."
              delay={0.03}
            />
            <MetricCard
              label="All shipments"
              value={totals.shipments.toString()}
              detail={`${totals.active} shipments are still active in the network.`}
              delay={0.06}
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
              detail="The next tracking number will be assigned on confirmation."
              delay={0.15}
            />
          </div>
        </motion.section>
        )}

        {activeWorkspaceTab === "partners" && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Partner approvals</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Approve new business partners before they can sign in</h2>
            </div>
            <div className="text-sm text-neutral-500">
              Approval emails a temporary password and unlocks the partner shipment workspace.
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div id="partners-list" className={isSectionVisible("partners-list") ? selectionPanelClassName : "hidden"}>
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Partner requests</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">Select a business to review it</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                  {partnerAccounts.length}
                </div>
              </div>
              <div className="mt-4 space-y-3 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
                {partnerAccounts.length === 0 ? (
                  <div className="rounded-[20px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                    No partner registrations have been submitted yet.
                  </div>
                ) : (
                  partnerAccounts.map((partner) => {
                    const selected = partner.id === selectedPartnerId;

                    return (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => {
                          setSelectedPartnerId(partner.id);
                          setActiveWorkspaceSection("partners-details");
                        }}
                        className={[
                          "w-full rounded-[24px] border p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                          selected ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white hover:border-orange-200"
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-neutral-950">{partner.businessName}</div>
                            <div className="mt-1 text-sm text-neutral-600">{partner.email}</div>
                          </div>
                          <span
                            className={[
                              "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                              statusClasses(partner.status === "approved" ? "Approved" : "Inquiry received")
                            ].join(" ")}
                          >
                            {partner.status}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.16em] text-neutral-500">
                          <span>{partner.createdAt}</span>
                          {partner.phone ? <span>{partner.phone}</span> : <span>No phone yet</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div id="partners-details" className={isSectionVisible("partners-details") ? detailPanelClassName : "hidden"}>
              {selectedPartner ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspaceSection("partners-list")}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-200"
                      >
                        Back to partner requests
                      </button>
                      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">Selected business</div>
                      <h3 className="mt-3 text-2xl font-semibold text-neutral-950">{selectedPartner.businessName}</h3>
                    </div>
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                        statusClasses(selectedPartner.status === "approved" ? "Approved" : "Inquiry received")
                      ].join(" ")}
                    >
                      {selectedPartner.status}
                    </span>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label>
                      <span className={labelClassName}>Business name</span>
                      <input value={selectedPartner.businessName} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Business email</span>
                      <input value={selectedPartner.email} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Business phone</span>
                      <input value={selectedPartner.phone || "Not completed yet"} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Created</span>
                      <input value={selectedPartner.createdAt} readOnly className={fieldClassName} />
                    </label>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => void handleApprovePartner()}
                      disabled={selectedPartner.status === "approved"}
                      className={actionPrimaryClassName}
                    >
                      {selectedPartner.status === "approved" ? "Already approved" : "Approve and email password"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-neutral-600">Select a partner request to review it.</div>
              )}

              {partnerMessage && (
                <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                  {partnerMessage}
                </div>
              )}
            </div>
          </div>
        </motion.section>
        )}

        {activeWorkspaceTab === "request" && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Shipment requests</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Review inquiries, send quotes, and confirm payment before invoice and tracking issuance</h2>
            </div>
            <div className="text-sm text-neutral-500">
              Tracking numbers are only issued after a customer sends proof of payment and the admin confirms it.
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div id="transfers-list" className={isSectionVisible("transfers-list") ? selectionPanelClassName : "hidden"}>
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Shipment requests</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">Select a request to review</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                  {requestRecords.length}
                </div>
              </div>
              <div className="mt-4 space-y-3 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
              {requestRecords.length === 0 ? (
                <div className="rounded-[20px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                  No shipment requests have been submitted yet.
                </div>
              ) : (
                requestRecords.map((request) => {
                  const selected = request.id === selectedRequestId;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setActiveWorkspaceSection("transfers-details");
                      }}
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
            </div>

            <div id="transfers-details" className={isSectionVisible("transfers-details") ? detailPanelClassName : "hidden"}>
              {requestDraft ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspaceSection("transfers-list")}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-200"
                      >
                        Back to shipment requests
                      </button>
                      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">Selected request</div>
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
                      <input value={requestDraft.customer} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Quoted service</span>
                      <input value={requestDraft.serviceTitle} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer email</span>
                      <input value={requestDraft.customerEmail} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Customer phone</span>
                      <input value={requestDraft.customerPhone} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Origin</span>
                      <input value={requestDraft.origin} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Destination</span>
                      <input value={requestDraft.destination} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Delivery timeline</span>
                      <input value={requestDraft.eta} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Shipping date</span>
                      <input value={requestDraft.details?.route.shipmentDate ?? ""} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Package summary</span>
                      <input value={requestDraft.packageType} readOnly className={fieldClassName} />
                    </label>
                    <div>
                      <span className={labelClassName}>Status</span>
                      <div className={`${fieldClassName} inline-flex items-center`}>
                        {requestDraft.status}
                      </div>
                    </div>
                    <label>
                      <span className={labelClassName}>Invoice number</span>
                      <input value={requestDraft.invoiceNumber ?? "Issued after payment approval"} readOnly className={fieldClassName} />
                    </label>
                    <label>
                      <span className={labelClassName}>Invoice issued</span>
                      <input value={requestDraft.invoiceIssuedAt ?? "Pending approval"} readOnly className={fieldClassName} />
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Admin note or quote message</span>
                      <textarea
                        value={requestDraft.note}
                        onChange={(event) => handleRequestField("note", event.target.value)}
                        className={areaClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Bank name</span>
                      <input
                        value={requestDraft.bankName ?? ""}
                        onChange={(event) => handleRequestField("bankName", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Account number</span>
                      <input
                        value={requestDraft.accountNumber ?? ""}
                        onChange={(event) => handleRequestField("accountNumber", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Account name</span>
                      <input
                        value={requestDraft.accountName ?? ""}
                        onChange={(event) => handleRequestField("accountName", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    {renderRequestDetailsEditor()}
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

                  <div className="mt-6 grid gap-3 lg:grid-cols-4">
                    <button
                      type="button"
                      onClick={handleSaveRequest}
                      className={actionSecondaryClassName}
                    >
                      Save request
                    </button>
                    <button
                      type="button"
                      onClick={handleSendQuote}
                      className={actionSecondaryClassName}
                    >
                      Save and send quote email
                    </button>
                    <button
                      type="button"
                      onClick={handleApproveRequest}
                      className={actionPrimaryClassName}
                    >
                      Confirm payment and issue invoice + tracking
                    </button>
                    <button
                      type="button"
                      onClick={handleRejectRequest}
                      className={actionDangerClassName}
                    >
                      Reject request
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-sm leading-6 text-neutral-600">Select a shipment request to review it.</div>
              )}

              {requestMessage && (
                <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                  {requestMessage}
                </div>
              )}
            </div>
          </div>
        </motion.section>
        )}

        {activeWorkspaceTab === "contact" && (
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
            <div className="text-sm text-neutral-500">Every submitted contact form is stored in Supabase for follow-up.</div>
          </div>

          <div className="mt-6 space-y-5">
            <div id="contacts-list" className={isSectionVisible("contacts-list") ? selectionPanelClassName : "hidden"}>
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Contact requests</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">Select a message to open it</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                  {contactRequests.length}
                </div>
              </div>
              <div className="mt-4 space-y-3 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
              {contactRequests.length === 0 ? (
                <div className="rounded-[20px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                  No website contact requests have been submitted yet.
                </div>
              ) : (
                contactRequests.map((request) => {
                  const selected = request.id === selectedContactRequestId;

                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        setSelectedContactRequestId(request.id);
                        setActiveWorkspaceSection("contacts-details");
                      }}
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
            </div>

            <div id="contacts-details" className={isSectionVisible("contacts-details") ? detailPanelClassName : "hidden"}>
              {contactRequestDraft ? (
                <>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <button
                        type="button"
                        onClick={() => setActiveWorkspaceSection("contacts-list")}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-200"
                      >
                        Back to contact requests
                      </button>
                      <div className="mt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">Selected contact request</div>
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
                      className={actionPrimaryClassName}
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
        )}

        {activeWorkspaceTab === "tracking" && (
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

          <div className="mt-6 space-y-5">
            <div id="shipments-list" className={isSectionVisible("shipments-list") ? selectionPanelClassName : "hidden"}>
              <div className="flex items-center justify-between gap-3 border-b border-black/6 pb-3">
                <div>
                  <div className="text-sm font-semibold text-neutral-950">Shipment records</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-neutral-500">Select a shipment to edit it</div>
                </div>
                <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-600">
                  {shipments.length}
                </div>
              </div>
              <div className="mt-4 space-y-3 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-1">
              {shipments.length === 0 ? (
                <div className="rounded-[20px] border border-black/8 bg-white p-5 text-sm leading-6 text-neutral-600">
                  No shipment records are available yet.
                </div>
              ) : (
                shipments.map((shipment) => {
                  const selected = shipment.ref === selectedShipmentRef;

                  return (
                    <button
                      key={shipment.ref}
                      type="button"
                      onClick={() => {
                        setSelectedShipmentRef(shipment.ref);
                        setActiveWorkspaceSection("shipments-details");
                      }}
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
                        {shipment.createdAt}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            </div>

            <div id="shipments-details" className={isSectionVisible("shipments-details") ? detailPanelClassName : "hidden"}>
              {shipmentDraft ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveWorkspaceSection("shipments-list")}
                    className="inline-flex min-h-[40px] items-center justify-center rounded-[12px] border border-black/8 bg-white px-4 text-sm font-medium text-neutral-700 transition-colors hover:border-orange-200"
                  >
                    Back to shipment records
                  </button>
                  <div className="mt-4 text-xs uppercase tracking-[0.18em] text-neutral-500">Selected shipment</div>
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
                      <span className={labelClassName}>Customer</span>
                      <input
                        value={shipmentDraft.customer}
                        onChange={(event) => handleShipmentField("customer", event.target.value)}
                        className={fieldClassName}
                      />
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
                      <span className={labelClassName}>Delivery timeline</span>
                      <input
                        value={shipmentDraft.eta}
                        onChange={(event) => handleShipmentField("eta", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Package summary</span>
                      <input
                        value={shipmentDraft.packageType}
                        onChange={(event) => handleShipmentField("packageType", event.target.value)}
                        className={fieldClassName}
                      />
                    </label>
                    <label>
                      <span className={labelClassName}>Clearance fee</span>
                      <input
                        type="number"
                        value={shipmentDraft.clearanceFee ?? ""}
                        onChange={(event) =>
                          handleShipmentField(
                            "clearanceFee",
                            event.target.value ? Number(event.target.value) : shipmentDraft.clearanceFee
                          )
                        }
                        placeholder="Add a fee if required"
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
                    <label className="md:col-span-2">
                      <span className={labelClassName}>Latest tracking update</span>
                      <textarea
                        value={shipmentDraft.lastUpdate}
                        onChange={(event) => handleShipmentField("lastUpdate", event.target.value)}
                        className={areaClassName}
                      />
                    </label>
                  </div>

                  {renderShipmentDetailsEditor()}

                  <div className="mt-6 grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
                    <button
                      type="button"
                      onClick={handleSaveShipment}
                      className={actionPrimaryClassName}
                    >
                      Save shipment changes
                    </button>
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
        )}

        {activeWorkspaceTab === "booking" && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Booking setup</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Manage locations, rates, and packaging</h2>
            </div>
            <div className="max-w-2xl text-sm leading-6 text-neutral-500">
              Set the countries and cities you serve, the route rate cards you use internally, and the packaging types and package count presets available during booking.
            </div>
          </div>

          {renderShipmentSetupEditor()}
          {renderContentActionBar()}

          {contentMessage && (
            <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
              {contentMessage}
            </div>
          )}
        </motion.section>
        )}

        {activeWorkspaceTab === "content" && (
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12 }}
          className={panelClassName}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Website content</div>
              <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Edit landing page, customer pages, media, and copy</h2>
            </div>
            <div className="max-w-2xl text-sm leading-6 text-neutral-500">
              Update website text and media here. Booking options live in the Booking tab, request pricing lives in the Request tab, and tracking updates live in the Tracking tab.
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div id="content-header" className={isSectionVisible("content-header") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Header and contact modal</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <MediaField
                    label="Logo media"
                    title="Swift Signate logo"
                    value={contentDraft.navigation.logoMedia}
                    onChange={(value) => handleContentField("navigation", "logoMedia", value)}
                    onUpload={(event) => void handleMediaUpload(event, (value) => handleContentField("navigation", "logoMedia", value))}
                    placeholder="Paste a logo URL or upload an image, SVG, or video"
                    compact
                  />
                </div>
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
                  <span className={labelClassName}>WhatsApp link</span>
                  <input
                    value={contentDraft.navigation.whatsappHref}
                    onChange={(event) => handleContentField("navigation", "whatsappHref", event.target.value)}
                    className={fieldClassName}
                    placeholder="https://wa.me/2348000000000"
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

            <div id="content-footer" className={isSectionVisible("content-footer") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Footer</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>Facebook link</span>
                  <input
                    value={contentDraft.footer.facebookHref}
                    onChange={(event) => handleContentField("footer", "facebookHref", event.target.value)}
                    className={fieldClassName}
                    placeholder="https://facebook.com/yourpage"
                  />
                </label>
                <label>
                  <span className={labelClassName}>Instagram link</span>
                  <input
                    value={contentDraft.footer.instagramHref}
                    onChange={(event) => handleContentField("footer", "instagramHref", event.target.value)}
                    className={fieldClassName}
                    placeholder="https://instagram.com/yourhandle"
                  />
                </label>
                <label>
                  <span className={labelClassName}>TikTok link</span>
                  <input
                    value={contentDraft.footer.tiktokHref}
                    onChange={(event) => handleContentField("footer", "tiktokHref", event.target.value)}
                    className={fieldClassName}
                    placeholder="https://tiktok.com/@yourhandle"
                  />
                </label>
                <label>
                  <span className={labelClassName}>X link</span>
                  <input
                    value={contentDraft.footer.xHref}
                    onChange={(event) => handleContentField("footer", "xHref", event.target.value)}
                    className={fieldClassName}
                    placeholder="https://x.com/yourhandle"
                  />
                </label>
              </div>
            </div>

            <div id="content-hero" className={isSectionVisible("content-hero") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
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
                <div className="md:col-span-2">
                  <MediaField
                    label="Background media"
                    title="Hero background"
                    value={contentDraft.hero.backgroundImage}
                    onChange={(value) => handleContentField("hero", "backgroundImage", value)}
                    onUpload={(event) => void handleMediaUpload(event, (value) => handleContentField("hero", "backgroundImage", value))}
                    placeholder="Paste an image or video URL, or upload any media file"
                  />
                </div>
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

            <div id="content-services" className={isSectionVisible("content-services") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
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
                      <div>
                        <MediaField
                          label="Card media"
                          title={card.title}
                          value={card.image ?? ""}
                          onChange={(value) => handleCardField("services", index, "image", value)}
                          onUpload={(event) => void handleMediaUpload(event, (value) => handleCardField("services", index, "image", value))}
                          placeholder="Paste a media URL or upload an image, video, audio, PDF, or file"
                          compact
                        />
                      </div>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={card.copy} onChange={(event) => handleCardField("services", index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="content-why-us" className={isSectionVisible("content-why-us") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
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
                <div className="md:col-span-2">
                  <MediaField
                    label="Section media"
                    title="Why choose us media"
                    value={contentDraft.whyUs.image}
                    onChange={(value) => handleContentField("whyUs", "image", value)}
                    onUpload={(event) => void handleMediaUpload(event, (value) => handleContentField("whyUs", "image", value))}
                    placeholder="Paste a media URL or upload an image, video, audio, PDF, or file"
                  />
                </div>
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
                      <div>
                        <IconField
                          label="Card icon"
                          title={`${point.title} icon`}
                          value={point.icon}
                          fallbackValue="clipboard"
                          onChange={(value) => handleCardField("whyUs", index, "icon", value)}
                          onUpload={(event) => void handleMediaUpload(event, (value) => handleCardField("whyUs", index, "icon", value))}
                        />
                      </div>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={point.copy} onChange={(event) => handleCardField("whyUs", index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="content-process" className={isSectionVisible("content-process") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
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
                      <div>
                        <IconField
                          label="Step icon"
                          title={`${step.title} icon`}
                          value={step.icon}
                          fallbackValue={index === 0 ? "quote" : index === 1 ? "route" : "delivery"}
                          onChange={(value) => handleProcessStepField(index, "icon", value)}
                          onUpload={(event) => void handleMediaUpload(event, (value) => handleProcessStepField(index, "icon", value))}
                        />
                      </div>
                      <label>
                        <span className={labelClassName}>Copy</span>
                        <textarea value={step.copy} onChange={(event) => handleProcessStepField(index, "copy", event.target.value)} className={areaClassName} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div id="content-customer-pages" className={isSectionVisible("content-customer-pages") ? "rounded-[22px] bg-white p-5 shadow-[0_12px_28px_rgba(15,23,42,0.05)]" : "hidden"}>
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Contact CTA and customer pages</div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label>
                  <span className={labelClassName}>CTA eyebrow</span>
                  <input value={contentDraft.contactCta.eyebrow} onChange={(event) => handleContentField("contactCta", "eyebrow", event.target.value)} className={fieldClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Primary button label</span>
                  <input value={contentDraft.contactCta.primaryLabel} onChange={(event) => handleContentField("contactCta", "primaryLabel", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>CTA title</span>
                  <input value={contentDraft.contactCta.title} onChange={(event) => handleContentField("contactCta", "title", event.target.value)} className={fieldClassName} />
                </label>
                <label className="md:col-span-2">
                  <span className={labelClassName}>CTA description</span>
                  <textarea value={contentDraft.contactCta.copy} onChange={(event) => handleContentField("contactCta", "copy", event.target.value)} className={areaClassName} />
                </label>
                <label>
                  <span className={labelClassName}>Secondary button label</span>
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
                  <span className={labelClassName}>Booking help text</span>
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
                  <span className={labelClassName}>Tracking help text</span>
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

            {renderContentActionBar()}

            {contentMessage && (
              <div className="mt-5 rounded-[20px] border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                {contentMessage}
              </div>
            )}
          </div>
        </motion.section>
        )}
        </div>
      </div>
    </ConsoleShell>
  );
}
