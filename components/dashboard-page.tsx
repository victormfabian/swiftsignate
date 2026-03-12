"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthPanel } from "@/components/auth-panel";
import { useAuthSession } from "@/components/auth-session";
import { IconGlyph } from "@/components/icon-glyph";
import { LogoMark } from "@/components/logo-mark";
import { SiteFooter } from "@/components/site-footer";
import { getShipmentSteps, useShipmentStore, type Shipment } from "@/components/shipment-store";
import { useSiteContentStore } from "@/components/site-content-store";
import { defaultBookingConfig } from "@/lib/site-content-model";
import { formatShipmentStatusLabel, normalizeTrackingNumber, type BookingRecordDetails } from "@/lib/shipment-model";

type DashboardTab = "book" | "track";
type BookingStep = 1 | 2 | 3;
type ShipperType = "private" | "business";
type WeightUnit = "kg" | "lb";
type DimensionUnit = "cm" | "in";
type DashboardDisplayMode = "page" | "modal";

type BookingForm = {
  shipperType: ShipperType | "";
  fromCountry: string;
  fromCity: string;
  toCountry: string;
  toCity: string;
  shipmentDate: string;
  residential: boolean | null;
  packagingType: string;
  higherLiability: boolean | null;
  weightUnit: WeightUnit;
  dimensionUnit: DimensionUnit;
};

type PackageEntry = {
  id: string;
  weight: string;
  length: string;
  width: string;
  height: string;
};

type ContactDetails = {
  name: string;
  company: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  postalCode: string;
  residential: boolean;
};

type TransferProof = {
  name: string;
  type: string;
  dataUrl: string;
};

type QuotePricingContext = {
  packageCount: number;
  chargeableWeight: number;
  packagingAdjustment: number;
  shipperMarkup: number;
  liabilitySurcharge: number;
  residentialSurcharge: number;
  packageSurcharge: number;
  extrasTotal: number;
  inputWeightUnit: WeightUnit;
};

const CUSTOMER_EMAIL_KEY = "swift-signate-customer-email";

let packageEntrySeed = 1;

function createPackageEntry(): PackageEntry {
  return {
    id: `package-${packageEntrySeed++}`,
    weight: "",
    length: "",
    width: "",
    height: ""
  };
}

const INITIAL_BOOKING_FORM: BookingForm = {
  shipperType: "business",
  fromCountry: "",
  fromCity: "",
  toCountry: "",
  toCity: "",
  shipmentDate: new Date().toISOString().slice(0, 10),
  residential: null,
  packagingType: "",
  higherLiability: null,
  weightUnit: "kg",
  dimensionUnit: "cm"
};

const EMPTY_CONTACT_DETAILS: ContactDetails = {
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

function cloneContactDetails(details: ContactDetails): ContactDetails {
  return {
    ...details
  };
}

function resolveClientPhoneValue(...values: Array<string | null | undefined>) {
  for (const candidate of values) {
    const normalized = candidate?.trim() ?? "";

    if (!normalized || normalized.includes("@")) {
      continue;
    }

    return normalized;
  }

  return "";
}

function isPartyDetailsComplete(details: ContactDetails, options?: { requirePostalCode?: boolean }) {
  const requiredFields = [details.name, details.email, details.phone, details.address1, details.city];

  if (options?.requirePostalCode) {
    requiredFields.push(details.postalCode);
  }

  return requiredFields.every((value) => value.trim());
}

function requestHasCompleteContacts(details?: BookingRecordDetails | null) {
  if (!details) {
    return false;
  }

  return (
    isPartyDetailsComplete({
      ...EMPTY_CONTACT_DETAILS,
      ...details.sender
    }) &&
    isPartyDetailsComplete(
      {
        ...EMPTY_CONTACT_DETAILS,
        ...details.receiver
      },
      { requirePostalCode: true }
    )
  );
}

function statusClasses(status: string) {
  switch (status) {
    case "Delivered":
      return "border-emerald-300 bg-white text-emerald-700";
    case "In transit":
      return "border-orange-300 bg-white text-ember";
    case "Out for delivery":
      return "border-sky-300 bg-white text-sky-700";
    case "Picked up":
      return "border-amber-300 bg-white text-amber-700";
    default:
      return "border-neutral-300 bg-white text-neutral-600";
  }
}

function requestStatusClasses(status: string) {
  switch (status) {
    case "Inquiry received":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Quote sent":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Payment submitted":
    case "Awaiting verification":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Approved":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Rejected":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-neutral-300 bg-white text-neutral-600";
  }
}

function SectionBadge({ label }: { label: string }) {
  return <div className="text-xs font-medium uppercase tracking-[0.18em] text-ember">{label}</div>;
}

function TrackingStatusMarker({ complete }: { complete: boolean }) {
  if (complete) {
    return (
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
          <path d="m4.5 10 3.4 3.4 7.6-8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return <span className="inline-flex h-6 w-6 shrink-0 rounded-full border-2 border-emerald-200 bg-white" />;
}

function AssistantLane({
  children,
  laneRef
}: {
  children: ReactNode;
  laneRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={laneRef}
      className="flex items-stretch gap-4 overflow-x-auto px-1 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

const laneCardClassName =
  "w-[calc(100vw-2.75rem)] max-w-[420px] shrink-0 snap-start rounded-[24px] bg-white p-5 shadow-[0_10px_24px_rgba(140,110,78,0.05)] md:min-w-[340px]";
const laneWideCardClassName =
  "w-[calc(100vw-2.75rem)] shrink-0 snap-start rounded-[24px] bg-white p-5 shadow-[0_10px_24px_rgba(140,110,78,0.05)] md:min-w-[680px] md:max-w-[920px]";
const laneInputClassName =
  "h-13 w-full rounded-[16px] border border-black/10 bg-white px-4 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-300";
const contactCardClassName =
  "rounded-[24px] bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]";
const contactFieldClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-white px-4 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 transition-colors focus:border-orange-300";
const contactReadonlyFieldClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-[#f7f5f1] px-4 text-sm text-neutral-900 outline-none";
const contactLabelClassName = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-neutral-500";
const laneChoiceClass = (selected: boolean) =>
  [
    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
    selected ? "border-orange-300 bg-orange-50 text-ember" : "border-black/8 bg-white text-neutral-700 hover:border-orange-200"
  ].join(" ");

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(value);
}

function formatRatePerKg(value: number) {
  return `${formatCurrency(value)} / kg`;
}

function formatWeight(value: number) {
  return `${new Intl.NumberFormat("en-NG", {
    minimumFractionDigits: value >= 10 ? 0 : 1,
    maximumFractionDigits: 1
  }).format(value)} kg`;
}

function formatShipmentDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function buildQuotePricingContext(
  form: BookingForm,
  packages: PackageEntry[],
  bookingConfig: typeof defaultBookingConfig
) {
  const weightMultiplier = form.weightUnit === "lb" ? 0.453592 : 1;
  const dimensionMultiplier = form.dimensionUnit === "in" ? 2.54 : 1;
  const packageCount = Math.max(packages.length, 1);
  const totalActualWeight = packages.reduce((sum, currentPackage) => {
    const normalizedWeight = (Number(currentPackage.weight) || 0) * weightMultiplier;

    return sum + Math.max(normalizedWeight, bookingConfig.pricing.minimumChargeableWeight || 0.5);
  }, 0);
  const totalVolumetricWeight = packages.reduce((sum, currentPackage) => {
    const lengthValue = Number(currentPackage.length);
    const widthValue = Number(currentPackage.width);
    const heightValue = Number(currentPackage.height);

    if (!(lengthValue > 0 && widthValue > 0 && heightValue > 0)) {
      return sum;
    }

    const length = Math.max(lengthValue * dimensionMultiplier, 1);
    const width = Math.max(widthValue * dimensionMultiplier, 1);
    const height = Math.max(heightValue * dimensionMultiplier, 1);

    return sum + (length * width * height) / Math.max(bookingConfig.pricing.volumetricDivisor || 5000, 1);
  }, 0);
  const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);
  const shipperMarkup = form.shipperType === "business" ? bookingConfig.pricing.businessMarkup : 0;
  const packagingAdjustment =
    bookingConfig.packagingOptions.find((option) => option.label === form.packagingType)?.priceAdjustment ?? 0;
  const liabilitySurcharge = form.higherLiability ? packageCount * bookingConfig.pricing.liabilitySurcharge : 0;
  const residentialSurcharge = form.residential ? bookingConfig.pricing.residentialAddressSurcharge : 0;
  const packageSurcharge = Math.max(packageCount - 1, 0) * bookingConfig.pricing.additionalPackageSurcharge;
  const extrasTotal =
    shipperMarkup +
    packagingAdjustment +
    liabilitySurcharge +
    residentialSurcharge +
    packageSurcharge;

  return {
    packageCount,
    chargeableWeight,
    packagingAdjustment,
    shipperMarkup,
    liabilitySurcharge,
    residentialSurcharge,
    packageSurcharge,
    extrasTotal,
    inputWeightUnit: form.weightUnit
  };
}

function buildQuoteHighlights(form: BookingForm, pricingContext: QuotePricingContext) {
  const highlights = [
    `${pricingContext.packageCount} ${pricingContext.packageCount === 1 ? "package" : "packages"}`,
    `${formatWeight(pricingContext.chargeableWeight)} chargeable`,
    pricingContext.inputWeightUnit === "lb" ? "Weight converted from lb" : "Weight captured in kg"
  ];

  if (form.packagingType) {
    highlights.push(form.packagingType);
  }

  if (form.higherLiability) {
    highlights.push("Extra cover");
  }

  if (form.residential) {
    highlights.push("Residential delivery");
  }

  if (form.shipperType === "business") {
    highlights.push("Business shipment");
  }

  return highlights;
}

function PricingPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/8 bg-[#fffaf4] px-3 py-1.5 text-xs font-medium text-neutral-700">
      {label}
    </span>
  );
}

function QuotePlane() {
  return (
    <svg viewBox="0 0 120 48" className="h-9 w-20" fill="none">
      <path d="M8 26h33l22-8h35c3.5 0 6 1.7 6 4s-2.5 4-6 4H62l-22 8H18l6-8H8v-4Z" fill="#fdba74" />
      <path d="M26 22 11 14h11l12 8h21l24-9h10l-17 9h12c3.3 0 6 1.8 6 4s-2.7 4-6 4H72l17 9H79l-24-9H34l-12 8H11l15-8Z" fill="#f97316" />
      <path d="M80 17h13" stroke="#171412" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PackagingPreview({
  icon,
  label
}: {
  icon: string;
  label: string;
}) {
  return (
    <div className="flex h-[88px] w-[120px] flex-col items-center justify-center gap-2 rounded-[20px] border border-black/10 bg-white px-3 shadow-[0_10px_20px_rgba(140,110,78,0.05)]">
      <div className="flex h-10 w-10 items-center justify-center text-ember">
        <IconGlyph
          icon={icon}
          className="h-10 w-10"
          fallbackClassName="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-600"
        />
      </div>
      <div className="text-center text-[11px] font-medium leading-4 text-neutral-600">{label}</div>
    </div>
  );
}

type DashboardPageProps = {
  initialTab?: DashboardTab;
  initialTrackingRef?: string;
  displayMode?: DashboardDisplayMode;
  lockedTab?: DashboardTab;
  onClose?: () => void;
};

export function DashboardPage({
  initialTab = "book",
  initialTrackingRef,
  displayMode = "page",
  lockedTab,
  onClose
}: DashboardPageProps) {
  const {
    shipments,
    paymentRequests,
    customerUpdates,
    submitTransferRequest,
    submitPaymentProof,
    saveRequestCustomerDetails,
    lookupShipment,
    markCustomerUpdateRead
  } = useShipmentStore();
  const { currentUser, isUserAuthenticated, loading: authLoading, refreshSession, signOut } = useAuthSession();
  const { content } = useSiteContentStore();
  const bookingConfig = {
    ...defaultBookingConfig,
    ...content.bookingConfig,
    routeCountries:
      content.bookingConfig.routeCountries.length > 0
        ? content.bookingConfig.routeCountries
        : defaultBookingConfig.routeCountries,
    routeRates:
      content.bookingConfig.routeRates.length > 0
        ? content.bookingConfig.routeRates
        : defaultBookingConfig.routeRates,
    packageCountSuggestions:
      content.bookingConfig.packageCountSuggestions.length > 0
        ? content.bookingConfig.packageCountSuggestions
        : defaultBookingConfig.packageCountSuggestions,
    packagingOptions:
      content.bookingConfig.packagingOptions.length > 0
        ? content.bookingConfig.packagingOptions
        : defaultBookingConfig.packagingOptions,
    deliveryOptions:
      content.bookingConfig.deliveryOptions.length > 0
        ? content.bookingConfig.deliveryOptions
        : defaultBookingConfig.deliveryOptions,
    pricing: {
      ...defaultBookingConfig.pricing,
      ...content.bookingConfig.pricing
    }
  };
  const countryOptions = bookingConfig.routeCountries.map((country) => country.name);
  const pickupSuggestions = countryOptions;
  const destinationSuggestions = countryOptions;
  const shipmentSteps = getShipmentSteps();
  const router = useRouter();
  const isModal = displayMode === "modal";
  const isLockedToSingleTab = Boolean(lockedTab);

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [bookingStep, setBookingStep] = useState<BookingStep>(1);
  const [notice, setNotice] = useState("");
  const [trackingInput, setTrackingInput] = useState(initialTrackingRef ? normalizeTrackingNumber(initialTrackingRef) : "");
  const [trackingQuery, setTrackingQuery] = useState(initialTrackingRef ? normalizeTrackingNumber(initialTrackingRef) : "");
  const [trackingResult, setTrackingResult] = useState<Shipment | null>(null);
  const [trackingLookupStarted, setTrackingLookupStarted] = useState(Boolean(initialTrackingRef));
  const [trackingLookupLoading, setTrackingLookupLoading] = useState(false);
  const [bookingForm, setBookingForm] = useState<BookingForm>(INITIAL_BOOKING_FORM);
  const [packageEntries, setPackageEntries] = useState<PackageEntry[]>([]);
  const [senderDetails, setSenderDetails] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [receiverDetails, setReceiverDetails] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [transferSubmitted, setTransferSubmitted] = useState(false);
  const [savedCustomerEmail, setSavedCustomerEmail] = useState("");
  const [profileForm, setProfileForm] = useState({
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [proofUploadRequestId, setProofUploadRequestId] = useState("");
  const [activeRequestWorkflowId, setActiveRequestWorkflowId] = useState("");
  const [activeRequestSender, setActiveRequestSender] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [activeRequestReceiver, setActiveRequestReceiver] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [requestContactSaving, setRequestContactSaving] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState<{
    open: boolean;
    loading: boolean;
    title: string;
    message: string;
  }>({ open: false, loading: false, title: "", message: "" });
  const routeLaneRef = useRef<HTMLDivElement | null>(null);
  const packageLaneRef = useRef<HTMLDivElement | null>(null);
  const fullStepperRef = useRef<HTMLDivElement | null>(null);
  const compactStepperRef = useRef<HTMLDivElement | null>(null);
  const requiresUserAuth = activeTab !== "track";

  const activeStepIndex = trackingResult
    ? shipmentSteps.findIndex((step) => step === trackingResult.status)
    : -1;
  const visibleCustomerUpdates = customerUpdates.filter(
    (update) => update.customerEmail.toLowerCase() === savedCustomerEmail.toLowerCase() && !update.read
  );
  const visiblePaymentRequests = [...paymentRequests].sort((left, right) => right.id.localeCompare(left.id));
  const requiresPartnerSetup = Boolean(currentUser && (currentUser.mustChangePassword || !currentUser.phone.trim()));
  const showCustomerWorkspace = !isLockedToSingleTab && isUserAuthenticated;
  const bookingStepLabels = [
    { step: 1 as BookingStep, label: content.customerPages.stepLabels.route },
    { step: 2 as BookingStep, label: content.customerPages.stepLabels.shipment },
    { step: 3 as BookingStep, label: "Request review" }
  ];

  const quotePricing = buildQuotePricingContext(bookingForm, packageEntries, bookingConfig);
  const quoteHighlights = buildQuoteHighlights(bookingForm, quotePricing);
  const selectedPackagingOption =
    bookingConfig.packagingOptions.find((option) => option.label === bookingForm.packagingType) ??
    bookingConfig.packagingOptions[0] ??
    defaultBookingConfig.packagingOptions[0];
  const routeStepComplete =
    Boolean(bookingForm.shipperType) &&
    Boolean(bookingForm.fromCountry) &&
    Boolean(bookingForm.fromCity) &&
    Boolean(bookingForm.toCountry) &&
    Boolean(bookingForm.toCity) &&
    bookingForm.residential !== null;
  const packageStepComplete =
    Boolean(bookingForm.packagingType) &&
    bookingForm.higherLiability !== null &&
    packageEntries.length > 0 &&
    packageEntries.every((entry) => entry.weight.trim());
  const activeWorkflowRequest =
    activeRequestWorkflowId ? visiblePaymentRequests.find((request) => request.id === activeRequestWorkflowId) ?? null : null;
  const modalDashboardHref =
    activeTab === "book"
      ? "/dashboard/book"
      : trackingQuery
        ? `/dashboard/track?ref=${encodeURIComponent(trackingQuery)}`
        : "/dashboard/track";
  const pageTitle =
    activeTab === "book" ? content.customerPages.bookTitle : content.customerPages.trackTitle;
  const pageCopy =
    !isLockedToSingleTab
      ? "Manage bookings, requests, and tracking from one workspace."
      : activeTab === "book"
        ? "Submit your shipment request."
        : "Track an active shipment.";

  useEffect(() => {
    setActiveTab(lockedTab ?? initialTab);
  }, [initialTab, lockedTab]);

  useEffect(() => {
    if (!initialTrackingRef) {
      return;
    }

    const normalizedRef = normalizeTrackingNumber(initialTrackingRef);
    setTrackingInput(normalizedRef);
    setTrackingQuery(normalizedRef);
    setTrackingLookupStarted(true);
    if (lockedTab !== "book") {
      setActiveTab("track");
    }
  }, [initialTrackingRef, lockedTab]);

  useEffect(() => {
    if (!trackingQuery.trim()) {
      setTrackingResult(null);
      setTrackingLookupLoading(false);
      return;
    }

    let cancelled = false;

    const loadTrackingResult = async () => {
      setTrackingLookupLoading(true);

      try {
        const shipment = await lookupShipment(trackingQuery);

        if (!cancelled) {
          setTrackingResult(shipment);
        }
      } catch {
        if (!cancelled) {
          setTrackingResult(null);
          setNotice("We could not check that shipment right now. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setTrackingLookupLoading(false);
        }
      }
    };

    void loadTrackingResult();

    return () => {
      cancelled = true;
    };
  }, [lookupShipment, trackingQuery]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setSavedCustomerEmail(window.localStorage.getItem(CUSTOMER_EMAIL_KEY) ?? "");
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    setSavedCustomerEmail(currentUser.email);
    setProfileForm((current) => ({
      ...current,
      phone: resolveClientPhoneValue(current.phone, currentUser.phone)
    }));
    setSenderDetails((current) => ({
      ...current,
      company: current.company || currentUser.name,
      email: current.email || currentUser.email,
      phone: resolveClientPhoneValue(current.phone, currentUser.phone)
    }));
  }, [currentUser]);

  const updateBookingField = <K extends keyof BookingForm>(field: K, value: BookingForm[K]) => {
    setBookingForm((current) => {
      const next = {
        ...current,
        [field]: value
      };

      if (field === "toCountry" && value !== current.toCountry) {
        next.toCity = "";
        next.residential = null;
      }

      if (field === "fromCountry" && value !== current.fromCountry) {
        next.fromCity = "";
        next.residential = null;
      }

      return next;
    });
  };

  const updatePackageField = <K extends Exclude<keyof PackageEntry, "id">>(
    packageId: string,
    field: K,
    value: PackageEntry[K]
  ) => {
    setPackageEntries((current) =>
      current.map((entry) =>
        entry.id === packageId
          ? {
              ...entry,
              [field]: value
            }
          : entry
      )
    );
  };

  const addPackageEntry = () => {
    setPackageEntries((current) => [...current, createPackageEntry()]);
  };

  const syncPackageCount = (nextCount: number) => {
    setPackageEntries((current) => {
      if (current.length === nextCount) {
        return current;
      }

      if (current.length > nextCount) {
        return current.slice(0, nextCount);
      }

      return [...current, ...Array.from({ length: nextCount - current.length }, () => createPackageEntry())];
    });
  };

  const removePackageEntry = (packageId: string) => {
    setPackageEntries((current) => (current.length > 1 ? current.filter((entry) => entry.id !== packageId) : current));
  };

  const updateContactField = <K extends keyof ContactDetails>(
    side: "sender" | "receiver",
    field: K,
    value: ContactDetails[K]
  ) => {
    const updater = (current: ContactDetails) => ({
      ...current,
      [field]: value
    });

    if (side === "sender") {
      setSenderDetails(updater);
      return;
    }

    setReceiverDetails(updater);
  };

  const persistCustomerEmail = (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CUSTOMER_EMAIL_KEY, normalizedEmail);
    setSavedCustomerEmail(normalizedEmail);
  };

  const resetBookingFlow = () => {
    setBookingStep(1);
    setBookingForm(INITIAL_BOOKING_FORM);
    setPackageEntries([]);
    setSenderDetails(
      currentUser
        ? {
            ...EMPTY_CONTACT_DETAILS,
            name: currentUser.name,
            email: currentUser.email,
            phone: resolveClientPhoneValue(currentUser.phone),
            company: currentUser.name
          }
        : EMPTY_CONTACT_DETAILS
    );
    setReceiverDetails(EMPTY_CONTACT_DETAILS);
    setTransferSubmitted(false);
  };

  const formatMissingFields = (fields: string[]) => {
    if (fields.length === 1) {
      return fields[0];
    }

    if (fields.length === 2) {
      return `${fields[0]} and ${fields[1]}`;
    }

    return `${fields.slice(0, -1).join(", ")}, and ${fields[fields.length - 1]}`;
  };

  const getRouteValidationMessage = () => {
    const missing: string[] = [];

    if (!bookingForm.shipperType) {
      missing.push("shipper type");
    }
    if (!bookingForm.fromCountry) {
      missing.push("origin country");
    }
    if (!bookingForm.fromCity.trim()) {
      missing.push("origin city");
    }
    if (!bookingForm.toCountry) {
      missing.push("destination country");
    }
    if (!bookingForm.toCity.trim()) {
      missing.push("destination city");
    }
    if (bookingForm.residential === null) {
      missing.push("address type");
    }

    if (missing.length === 0) {
      return "";
    }

    return `Complete ${formatMissingFields(missing)} before continuing.`;
  };

  const getPackageValidationMessage = () => {
    const missing: string[] = [];

    if (!bookingForm.packagingType) {
      missing.push("packaging type");
    }
    if (bookingForm.higherLiability === null) {
      missing.push("liability cover choice");
    }
    if (packageEntries.length === 0) {
      missing.push("at least one package");
    }

    packageEntries.forEach((entry, index) => {
      const packageMissing: string[] = [];

      if (!entry.weight.trim()) {
        packageMissing.push("weight");
      }

      if (packageMissing.length > 0) {
        missing.push(`package ${index + 1} ${formatMissingFields(packageMissing)}`);
      }
    });

    if (missing.length === 0) {
      return "";
    }

    return `Complete ${formatMissingFields(missing)} before reviewing the shipment request.`;
  };

  const getContactValidationMessage = (sender = senderDetails, receiver = receiverDetails) => {
    const missing: string[] = [];

    if (!sender.name.trim()) {
      missing.push("sender name");
    }
    if (!sender.email.trim()) {
      missing.push("sender email");
    }
    if (!sender.phone.trim()) {
      missing.push("sender phone");
    }
    if (!sender.address1.trim()) {
      missing.push("sender address");
    }
    if (!sender.city.trim()) {
      missing.push("sender city");
    }
    if (!receiver.name.trim()) {
      missing.push("receiver name");
    }
    if (!receiver.email.trim()) {
      missing.push("receiver email");
    }
    if (!receiver.phone.trim()) {
      missing.push("receiver phone");
    }
    if (!receiver.address1.trim()) {
      missing.push("receiver address");
    }
    if (!receiver.city.trim()) {
      missing.push("receiver city");
    }
    if (!receiver.postalCode.trim()) {
      missing.push("receiver postal code");
    }

    if (missing.length === 0) {
      return "";
    }

    return `Complete ${formatMissingFields(missing)} before reviewing the request.`;
  };

  const readTransferProofFile = (file: File) =>
    new Promise<TransferProof>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          name: file.name,
          type: file.type,
          dataUrl: typeof reader.result === "string" ? reader.result : ""
        });
      };
      reader.onerror = () => {
        reject(new Error("Could not read the payment proof file."));
      };
      reader.readAsDataURL(file);
    });

  const validateTransferProof = (file: File) => {
    const maxSize = 1.5 * 1024 * 1024;
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      setNotice("Upload a payment proof as an image or PDF receipt.");
      return false;
    }

    if (file.size > maxSize) {
      setNotice("Payment proof must be 1.5 MB or smaller in this local demo.");
      return false;
    }

    return true;
  };

  const goToShipmentDetails = () => {
    const validationMessage = getRouteValidationMessage();
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    if (bookingForm.fromCountry === bookingForm.toCountry) {
      setNotice("Choose a destination that is different from the shipment origin.");
      return;
    }

    setNotice("");
    setBookingStep(2);
  };

  const goToDeliveryOptions = () => {
    const validationMessage = getPackageValidationMessage();
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    setNotice("");
    setBookingStep(3);
  };

  const handleTrackShipment = () => {
    if (!trackingInput.trim()) {
      setNotice("Enter a tracking number before searching.");
      return;
    }

    const normalizedReference = normalizeTrackingNumber(trackingInput);

    setNotice("");
    setTrackingInput(normalizedReference);
    setTrackingLookupStarted(true);
    setTrackingQuery(normalizedReference);
  };


  const handleCompletePartnerProfile = () => {
    void (async () => {
      if (!profileForm.phone.trim() || !profileForm.password.trim()) {
        setNotice("Add your business phone number and choose a new password to continue.");
        return;
      }

      if (profileForm.password.trim().length < 6) {
        setNotice("Use a password with at least 6 characters.");
        return;
      }

      if (profileForm.password !== profileForm.confirmPassword) {
        setNotice("Password confirmation does not match.");
        return;
      }

      setProfileSubmitting(true);

      try {
        const response = await fetch("/api/auth/complete-profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(profileForm)
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Could not complete your partner profile.");
          return;
        }

        setNotice("Your partner profile is ready. You can now submit shipment inquiries.");
        setProfileForm((current) => ({
          ...current,
          password: "",
          confirmPassword: ""
        }));
        await refreshSession();
      } catch {
        setNotice("Could not complete your partner profile right now. Please try again.");
      } finally {
        setProfileSubmitting(false);
      }
    })();
  };

  const buildBookingRecordDetails = (method: "Direct transfer" | "Paystack"): BookingRecordDetails => ({
    shipperType: bookingForm.shipperType,
    route: {
      fromCountry: bookingForm.fromCountry,
      fromCity: bookingForm.fromCity,
      toCountry: bookingForm.toCountry,
      toCity: bookingForm.toCity,
      shipmentDate: bookingForm.shipmentDate,
      residential: bookingForm.residential
    },
    shipment: {
      packagingType: bookingForm.packagingType,
      higherLiability: bookingForm.higherLiability,
      weightUnit: bookingForm.weightUnit,
      dimensionUnit: bookingForm.dimensionUnit,
      packages: packageEntries.map((entry) => ({ ...entry }))
    },
    sender: { ...senderDetails },
    receiver: { ...receiverDetails },
    quoteSort: "fastest",
    selectedQuote: null,
    payment: {
      method,
      note:
        method === "Direct transfer"
          ? "Shipment inquiry submitted. Waiting for the Swift Signate quote and payment details."
          : "Paystack payment confirmed"
    }
  });

  const handleTransferSubmission = () => {
    if (feedbackModal.loading || transferSubmitted) {
      return;
    }

    setTransferSubmitted(true);
    setNotice("");
    setFeedbackModal({
      open: true,
      loading: true,
      title: "Submitting shipment request",
      message: "Please wait while Swift Signate receives your shipment inquiry."
    });

    const customerEmail = (currentUser?.email ?? senderDetails.email).trim().toLowerCase();
    const customerName = (currentUser?.name ?? senderDetails.company ?? senderDetails.name).trim();
    const requestPayload = {
      customer: customerName,
      customerEmail,
      customerPhone: resolveClientPhoneValue(currentUser?.phone, senderDetails.phone),
      origin: `${bookingForm.fromCity}, ${bookingForm.fromCountry}`,
      destination: `${bookingForm.toCity}, ${bookingForm.toCountry}`,
      eta: "Timeline will be confirmed by Swift Signate",
      packageType: `${packageEntries.length} ${bookingForm.packagingType.toLowerCase()}`,
      paymentMethod: "Direct transfer" as const,
      serviceTitle: "Shipment inquiry",
      amount: 0,
      note: "Shipment inquiry submitted. Quote and payment details pending Swift Signate review.",
      paymentProofName: "",
      paymentProofType: "",
      paymentProofDataUrl: "",
      details: buildBookingRecordDetails("Direct transfer")
    };

    window.setTimeout(() => {
      void (async () => {
        try {
          await submitTransferRequest(requestPayload);
          persistCustomerEmail(customerEmail);
          resetBookingFlow();
          setFeedbackModal({
            open: true,
            loading: false,
            title: "Request received",
            message:
              "Your shipment request has been sent to Swift Signate. Swift Signate will review it and email your final quote and payment details shortly."
          });
          setNotice("Shipment request submitted. Wait for the Swift Signate quote email, then complete contact details and payment from your request card.");
        } catch {
          setTransferSubmitted(false);
          setFeedbackModal({
            open: true,
            loading: false,
            title: "Request submission failed",
            message: "We could not submit your shipment request right now. Please try again."
          });
          setNotice("Shipment request submission failed. Please try again.");
        }
      })();
    }, 1200);
  };

  const openRequestWorkflow = (request: typeof visiblePaymentRequests[number]) => {
    if (activeRequestWorkflowId === request.id) {
      setActiveRequestWorkflowId("");
      return;
    }

    setActiveRequestWorkflowId(request.id);
    setActiveRequestSender({
      ...cloneContactDetails(EMPTY_CONTACT_DETAILS),
      company: currentUser?.name ?? "",
      email: currentUser?.email ?? "",
      city: request.details?.route.fromCity ?? "",
      ...(request.details?.sender ?? {}),
      phone: resolveClientPhoneValue(request.details?.sender?.phone, request.customerPhone, currentUser?.phone)
    });
    setActiveRequestReceiver({
      ...cloneContactDetails(EMPTY_CONTACT_DETAILS),
      city: request.details?.route.toCity ?? "",
      ...(request.details?.receiver ?? {})
    });
  };

  const updateWorkflowContactField = <K extends keyof ContactDetails>(
    side: "sender" | "receiver",
    field: K,
    value: ContactDetails[K]
  ) => {
    const updater = (current: ContactDetails) => ({
      ...current,
      [field]: value
    });

    if (side === "sender") {
      setActiveRequestSender(updater);
      return;
    }

    setActiveRequestReceiver(updater);
  };

  const handleSaveQuotedRequestContacts = () => {
    if (!activeWorkflowRequest) {
      return;
    }

    const validationMessage = getContactValidationMessage(activeRequestSender, activeRequestReceiver);
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    setRequestContactSaving(true);
    setNotice("");

    void (async () => {
      try {
        await saveRequestCustomerDetails(activeWorkflowRequest.id, {
          customerPhone: activeRequestSender.phone.trim(),
          sender: activeRequestSender,
          receiver: activeRequestReceiver
        });
        setNotice("Contact details saved. You can now make payment and upload proof for this request.");
      } catch {
        setNotice("Could not save the contact details for this shipment request right now.");
      } finally {
        setRequestContactSaving(false);
      }
    })();
  };

  const handleExistingRequestProofChange = (requestId: string, event: ChangeEvent<HTMLInputElement>) => {
    const request = visiblePaymentRequests.find((item) => item.id === requestId);
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!requestHasCompleteContacts(request?.details)) {
      setNotice("Save the sender and receiver contact details for this request before uploading payment proof.");
      return;
    }

    if (!validateTransferProof(file)) {
      return;
    }

    setProofUploadRequestId(requestId);
    setNotice("");

    void (async () => {
      try {
        const proof = await readTransferProofFile(file);
        await submitPaymentProof(requestId, {
          paymentProofName: proof.name,
          paymentProofType: proof.type,
          paymentProofDataUrl: proof.dataUrl
        });
        setNotice("Payment proof submitted. Swift Signate will verify it and issue tracking after confirmation.");
      } catch {
        setNotice("Could not submit the payment proof right now. Please try again.");
      } finally {
        setProofUploadRequestId("");
      }
    })();
  };

  const closeFeedbackModal = () => {
    setFeedbackModal((current) => ({
      ...current,
      open: false,
      loading: false
    }));
  };

  const handleCustomerUpdateDismiss = (updateId: string) => {
    void markCustomerUpdateRead(updateId);
  };

  const navigateToBookingStep = (step: BookingStep) => {
    if (step === 1) {
      setBookingStep(1);
      return;
    }

    if (step === 2 && routeStepComplete && bookingForm.fromCountry !== bookingForm.toCountry) {
      setBookingStep(2);
      return;
    }

    if (step === 3 && packageStepComplete) {
      setBookingStep(3);
    }
  };

  if (authLoading && requiresUserAuth) {
    return (
      <div className={isModal ? "bg-white p-8" : "min-h-screen bg-white px-4 py-8"}>
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-[28px] border border-black/8 bg-white p-8 text-sm text-neutral-600 shadow-[0_18px_40px_rgba(140,110,78,0.08)]">
          Checking your secure session...
        </div>
      </div>
    );
  }

  if (!isUserAuthenticated && requiresUserAuth) {
    return (
        <AuthPanel
          role="user"
          mode={isModal ? "modal" : "page"}
          title="Partner log in"
          nextPath="/dashboard/track"
          onSuccess={() => {
            void refreshSession();
          }}
        onClose={isModal ? onClose : undefined}
      />
    );
  }

  const renderBookingStepper = (compact = false, containerRef?: RefObject<HTMLDivElement | null>) => (
    <div
      ref={containerRef}
      className={[
        "flex items-center gap-4 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        compact ? "min-w-max whitespace-nowrap" : "mb-6 min-w-max md:flex-wrap md:overflow-visible"
      ].join(" ")}
    >
      {bookingStepLabels.map((item) => {
        const active = bookingStep === item.step;

        return (
          <button
            key={item.step}
            data-step={item.step}
            type="button"
            onClick={() => navigateToBookingStep(item.step)}
            className={[
              "inline-flex shrink-0 items-center gap-2 px-1 py-1 transition-colors",
              compact ? "text-[11px] md:text-xs" : "text-xs md:text-sm",
              active ? "font-semibold text-ember" : "font-normal text-neutral-500 hover:text-neutral-700"
            ].join(" ")}
          >
            <span
              className={[
                compact ? "text-[10px] md:text-[11px]" : "text-[11px] md:text-xs",
                active ? "font-semibold text-ember" : "font-normal text-neutral-500"
              ].join(" ")}
            >
              0{item.step}
            </span>
            {item.label}
          </button>
        );
      })}
    </div>
  );

  const renderRouteAssistant = () => (
    <div className="space-y-6">
      <AssistantLane laneRef={routeLaneRef}>
        <div className={laneCardClassName}>
          <div className="text-base font-semibold text-neutral-950">Origin</div>
          <div className="mt-4 flex flex-wrap gap-3">
            {pickupSuggestions.map((country) => (
              <button
                key={country}
                type="button"
                onClick={() => updateBookingField("fromCountry", country)}
                className={laneChoiceClass(bookingForm.fromCountry === country)}
              >
                {country}
              </button>
            ))}
          </div>
          <select
            value={bookingForm.fromCountry}
            onChange={(event) => updateBookingField("fromCountry", event.target.value)}
            className={`${laneInputClassName} mt-4`}
          >
            <option value="">Select origin country</option>
            {countryOptions.map((country) => (
              <option key={country} value={country}>
                {country}
              </option>
            ))}
          </select>
          {bookingForm.fromCountry && (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap gap-3">
                {(bookingConfig.routeCountries.find((country) => country.name === bookingForm.fromCountry)?.cities ?? []).map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => updateBookingField("fromCity", city)}
                    className={laneChoiceClass(bookingForm.fromCity === city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
              <input
                value={bookingForm.fromCity}
                onChange={(event) => updateBookingField("fromCity", event.target.value)}
                placeholder="Origin city"
                className={laneInputClassName}
              />
            </div>
          )}
        </div>

        {bookingForm.fromCountry && bookingForm.fromCity && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Destination</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {destinationSuggestions.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => updateBookingField("toCountry", country)}
                  className={laneChoiceClass(bookingForm.toCountry === country)}
                >
                  {country}
                </button>
              ))}
            </div>
            <select
              value={bookingForm.toCountry}
              onChange={(event) => updateBookingField("toCountry", event.target.value)}
              className={`${laneInputClassName} mt-4`}
            >
              <option value="">Select destination country</option>
              {countryOptions.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {bookingForm.toCountry && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {(bookingConfig.routeCountries.find((country) => country.name === bookingForm.toCountry)?.cities ?? []).map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => updateBookingField("toCity", city)}
                      className={laneChoiceClass(bookingForm.toCity === city)}
                    >
                      {city}
                    </button>
                  ))}
                </div>
                <input
                  value={bookingForm.toCity}
                  onChange={(event) => updateBookingField("toCity", event.target.value)}
                  placeholder="Destination city"
                  className={laneInputClassName}
                />
              </div>
            )}
          </div>
        )}

        {bookingForm.fromCountry &&
          bookingForm.fromCity &&
          bookingForm.toCountry &&
          bookingForm.toCity && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Address type</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { value: true, label: "Yes, residential" },
                { value: false, label: "No, business address" }
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => updateBookingField("residential", option.value)}
                  className={laneChoiceClass(bookingForm.residential === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </AssistantLane>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={goToShipmentDetails}
          className="inline-flex min-h-[54px] items-center justify-center rounded-[14px] bg-ember px-8 text-base font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)]"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderPackageAssistant = () => (
    <div className="space-y-6">
      <AssistantLane laneRef={packageLaneRef}>
        <div className={laneCardClassName}>
          <div className="text-base font-semibold text-neutral-950">Packaging</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,240px)_120px] sm:items-end">
            <label className="block max-w-[260px]">
              <div className="overflow-hidden rounded-[20px] border border-black/12 bg-white shadow-[0_10px_20px_rgba(140,110,78,0.06)]">
                <div className="grid grid-cols-[6px_minmax(0,1fr)]">
                  <div className="bg-ember" />
                  <select
                    value={bookingForm.packagingType}
                    onChange={(event) => updateBookingField("packagingType", event.target.value)}
                    className="h-16 w-full bg-white px-5 text-base text-neutral-900 outline-none"
                  >
                    <option value="">Select packaging type</option>
                    {bookingConfig.packagingOptions.map((option) => (
                      <option key={option.id} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </label>

            <div className="flex h-[88px] w-[120px] items-center justify-center rounded-[20px] border border-black/10 bg-white shadow-[0_10px_20px_rgba(140,110,78,0.05)]">
              <PackagingPreview
                icon={selectedPackagingOption?.icon ?? defaultBookingConfig.packagingOptions[0].icon}
                label={selectedPackagingOption?.label ?? "Packaging"}
              />
            </div>
          </div>
          {bookingForm.packagingType && (
            <div className="mt-5 border-t border-black/8 pt-5">
              <div className="text-sm font-medium text-neutral-800">Package count</div>
              <div className="mt-3 flex flex-wrap gap-3">
                {bookingConfig.packageCountSuggestions.map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => syncPackageCount(count)}
                    className={laneChoiceClass(packageEntries.length === count)}
                  >
                    {count} {count === 1 ? "package" : "packages"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {bookingForm.packagingType && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Extra cover</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {[
                { value: true, label: "Yes, add extra cover" },
                { value: false, label: "No, standard cover" }
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => updateBookingField("higherLiability", option.value)}
                  className={laneChoiceClass(bookingForm.higherLiability === option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {packageEntries.length > 0 && (
          <div className={laneWideCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Package details</div>
            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              {packageEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="rounded-[22px] border border-black/10 bg-white p-5 shadow-[0_10px_20px_rgba(140,110,78,0.05)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Package {index + 1}</div>
                      <div className="mt-1 text-base font-semibold text-neutral-950">
                        {bookingForm.packagingType || "Shipment package"}
                      </div>
                    </div>
                    {packageEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePackageEntry(entry.id)}
                        className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="mt-5 grid gap-4">
                    <label className="block">
                      <span className="text-sm font-medium text-neutral-800">Weight</span>
                      <div className="mt-2 grid grid-cols-[1fr_72px] overflow-hidden rounded-[16px] border border-black/14 bg-white shadow-[0_10px_20px_rgba(140,110,78,0.05)]">
                        <input
                          value={entry.weight}
                          onChange={(event) => updatePackageField(entry.id, "weight", event.target.value)}
                          placeholder={bookingForm.weightUnit}
                          className="h-14 bg-white px-4 text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                        />
                        <select
                          value={bookingForm.weightUnit}
                          onChange={(event) => updateBookingField("weightUnit", event.target.value as WeightUnit)}
                          className="h-14 border-l border-black/10 bg-white px-2 text-center text-sm font-medium text-neutral-600 outline-none"
                        >
                          <option value="kg">kg</option>
                          <option value="lb">lb</option>
                        </select>
                      </div>
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-neutral-800">Dimensions (optional)</span>
                      <div className="mt-2 grid grid-cols-[1fr_auto_1fr_auto_1fr_64px] items-center overflow-hidden rounded-[16px] border border-black/14 bg-white shadow-[0_10px_20px_rgba(140,110,78,0.05)]">
                        <input
                          value={entry.length}
                          onChange={(event) => updatePackageField(entry.id, "length", event.target.value)}
                          placeholder="L"
                          className="h-14 min-w-0 bg-white px-3 text-center text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                        />
                        <div className="px-2 text-base text-neutral-400">x</div>
                        <input
                          value={entry.width}
                          onChange={(event) => updatePackageField(entry.id, "width", event.target.value)}
                          placeholder="W"
                          className="h-14 min-w-0 bg-white px-3 text-center text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                        />
                        <div className="px-2 text-base text-neutral-400">x</div>
                        <input
                          value={entry.height}
                          onChange={(event) => updatePackageField(entry.id, "height", event.target.value)}
                          placeholder="H"
                          className="h-14 min-w-0 bg-white px-3 text-center text-base text-neutral-900 outline-none placeholder:text-neutral-400"
                        />
                        <select
                          value={bookingForm.dimensionUnit}
                          onChange={(event) => updateBookingField("dimensionUnit", event.target.value as DimensionUnit)}
                          className="h-14 border-l border-black/10 bg-white px-1 text-center text-sm font-medium text-neutral-600 outline-none"
                        >
                          <option value="cm">cm</option>
                          <option value="in">in</option>
                        </select>
                      </div>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={addPackageEntry}
                className="inline-flex w-fit items-center gap-3 text-base font-semibold text-ember"
              >
                <span className="text-2xl leading-none">+</span>
                Add another package
              </button>
            </div>
          </div>
        )}
      </AssistantLane>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => setBookingStep(1)}
          className="rounded-[12px] border border-black/10 bg-white px-6 py-4 text-base font-medium text-neutral-700 transition-colors hover:border-orange-200 hover:text-neutral-950"
        >
          Back
        </button>
        <button
          type="button"
          onClick={goToDeliveryOptions}
          className="inline-flex min-h-[60px] items-center justify-center rounded-[12px] bg-ember px-10 text-lg font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)]"
        >
          Continue to request review
        </button>
      </div>
    </div>
  );

  const renderPartnerSetup = () => (
    <motion.div
      key="partner-setup"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.24 }}
      className={isModal ? "" : "rounded-[30px] bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
    >
      <div className="max-w-3xl">
        <SectionBadge label="Partner Setup" />
        <h2 className="mt-3 text-3xl font-semibold text-neutral-950 md:text-5xl">Complete your business profile</h2>
        <p className="mt-3 text-base leading-7 text-neutral-600">
          Your partner access has been approved. Add your business phone number and replace the temporary password before sending shipment inquiries.
        </p>
      </div>

      <div className="mt-8 grid gap-4 md:max-w-2xl md:grid-cols-2">
        <label className="md:col-span-2">
          <span className={contactLabelClassName}>Business email</span>
          <input value={currentUser?.email ?? ""} readOnly className={contactReadonlyFieldClassName} />
        </label>
        <label className="md:col-span-2">
          <span className={contactLabelClassName}>Business name</span>
          <input value={currentUser?.name ?? ""} readOnly className={contactReadonlyFieldClassName} />
        </label>
        <label className="md:col-span-2">
          <span className={contactLabelClassName}>Business phone</span>
          <input
            value={profileForm.phone}
            onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
            placeholder="Business phone number"
            className={contactFieldClassName}
          />
        </label>
        <label>
          <span className={contactLabelClassName}>New password</span>
          <input
            type="password"
            value={profileForm.password}
            onChange={(event) => setProfileForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Choose a new password"
            className={contactFieldClassName}
          />
        </label>
        <label>
          <span className={contactLabelClassName}>Confirm password</span>
          <input
            type="password"
            value={profileForm.confirmPassword}
            onChange={(event) => setProfileForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            placeholder="Confirm your password"
            className={contactFieldClassName}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-6 text-neutral-600">
          After this step, you can submit shipment inquiries and upload payment proofs from your workspace.
        </div>
        <button
          type="button"
          onClick={handleCompletePartnerProfile}
          disabled={profileSubmitting}
          className="inline-flex min-h-[52px] items-center justify-center rounded-[12px] bg-ember px-6 text-sm font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {profileSubmitting ? "Saving profile..." : "Complete partner setup"}
        </button>
      </div>
    </motion.div>
  );

  const renderQuotedRequestWorkflow = (request: typeof visiblePaymentRequests[number]) => {
    if (activeRequestWorkflowId !== request.id || request.status !== "Quote sent") {
      return null;
    }

    const savedContacts = requestHasCompleteContacts(request.details);

    return (
      <div className="mt-5 rounded-[24px] bg-[#fcfaf7] p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
        <div className="grid gap-6 xl:grid-cols-2">
          <div className={`${contactCardClassName} flex h-full flex-col`}>
            <div className="text-2xl font-semibold text-neutral-950">Sender contact</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Full name</span>
                <input
                  value={activeRequestSender.name}
                  onChange={(event) => updateWorkflowContactField("sender", "name", event.target.value)}
                  placeholder="Sender full name"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Company</span>
                <input
                  value={activeRequestSender.company}
                  onChange={(event) => updateWorkflowContactField("sender", "company", event.target.value)}
                  placeholder="Company name"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Email</span>
                <input
                  value={activeRequestSender.email}
                  onChange={(event) => updateWorkflowContactField("sender", "email", event.target.value)}
                  placeholder="Sender email"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Phone</span>
                <input
                  value={activeRequestSender.phone}
                  onChange={(event) => updateWorkflowContactField("sender", "phone", event.target.value)}
                  placeholder="Sender phone"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Address line 1</span>
                <input
                  value={activeRequestSender.address1}
                  onChange={(event) => updateWorkflowContactField("sender", "address1", event.target.value)}
                  placeholder="Address line 1"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Address line 2</span>
                <input
                  value={activeRequestSender.address2}
                  onChange={(event) => updateWorkflowContactField("sender", "address2", event.target.value)}
                  placeholder="Address line 2 (optional)"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>City</span>
                <input
                  value={activeRequestSender.city}
                  onChange={(event) => updateWorkflowContactField("sender", "city", event.target.value)}
                  placeholder="City"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Postal code</span>
                <input
                  value={activeRequestSender.postalCode}
                  onChange={(event) => updateWorkflowContactField("sender", "postalCode", event.target.value)}
                  placeholder="Postal code"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Country</span>
                <input value={request.details?.route.fromCountry ?? ""} readOnly className={contactReadonlyFieldClassName} />
              </label>
              <label className="md:col-span-2 flex min-h-12 items-center gap-3 rounded-[16px] border border-black/8 px-4 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={activeRequestSender.residential}
                  onChange={(event) => updateWorkflowContactField("sender", "residential", event.target.checked)}
                  className="h-5 w-5 rounded border border-black/20"
                />
                Residential address
              </label>
            </div>
          </div>

          <div className={`${contactCardClassName} flex h-full flex-col`}>
            <div className="text-2xl font-semibold text-neutral-950">Receiver contact</div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Full name</span>
                <input
                  value={activeRequestReceiver.name}
                  onChange={(event) => updateWorkflowContactField("receiver", "name", event.target.value)}
                  placeholder="Receiver full name"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Company</span>
                <input
                  value={activeRequestReceiver.company}
                  onChange={(event) => updateWorkflowContactField("receiver", "company", event.target.value)}
                  placeholder="Company name"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Email</span>
                <input
                  value={activeRequestReceiver.email}
                  onChange={(event) => updateWorkflowContactField("receiver", "email", event.target.value)}
                  placeholder="Receiver email"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Phone</span>
                <input
                  value={activeRequestReceiver.phone}
                  onChange={(event) => updateWorkflowContactField("receiver", "phone", event.target.value)}
                  placeholder="Receiver phone"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Address line 1</span>
                <input
                  value={activeRequestReceiver.address1}
                  onChange={(event) => updateWorkflowContactField("receiver", "address1", event.target.value)}
                  placeholder="Address line 1"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Address line 2</span>
                <input
                  value={activeRequestReceiver.address2}
                  onChange={(event) => updateWorkflowContactField("receiver", "address2", event.target.value)}
                  placeholder="Address line 2 (optional)"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>City</span>
                <input
                  value={activeRequestReceiver.city}
                  onChange={(event) => updateWorkflowContactField("receiver", "city", event.target.value)}
                  placeholder="City"
                  className={contactFieldClassName}
                />
              </label>
              <label>
                <span className={contactLabelClassName}>Postal code</span>
                <input
                  value={activeRequestReceiver.postalCode}
                  onChange={(event) => updateWorkflowContactField("receiver", "postalCode", event.target.value)}
                  placeholder="Postal code"
                  className={contactFieldClassName}
                />
              </label>
              <label className="md:col-span-2">
                <span className={contactLabelClassName}>Country</span>
                <input value={request.details?.route.toCountry ?? ""} readOnly className={contactReadonlyFieldClassName} />
              </label>
              <label className="md:col-span-2 flex min-h-12 items-center gap-3 rounded-[16px] border border-black/8 px-4 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={activeRequestReceiver.residential}
                  onChange={(event) => updateWorkflowContactField("receiver", "residential", event.target.checked)}
                  className="h-5 w-5 rounded border border-black/20"
                />
                Residential address
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={handleSaveQuotedRequestContacts}
              disabled={requestContactSaving}
              className="inline-flex min-h-[50px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {requestContactSaving ? "Saving contact details..." : "Save contact details"}
            </button>
            <label
              className={[
                "inline-flex min-h-[50px] items-center justify-center rounded-[12px] px-5 text-sm font-semibold",
                savedContacts
                  ? "cursor-pointer border border-dashed border-orange-300 bg-orange-50/40 text-ember"
                  : "cursor-not-allowed border border-black/8 bg-white text-neutral-400"
              ].join(" ")}
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(event) => handleExistingRequestProofChange(request.id, event)}
                className="hidden"
                disabled={!savedContacts}
              />
              {proofUploadRequestId === request.id
                ? "Uploading proof..."
                : savedContacts
                  ? "Upload payment proof"
                  : "Save contact details first"}
            </label>
          </div>
        </div>
      </div>
    );
  };

  const renderBookTab = () => (
    <motion.div
      key="book"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="p-5 md:p-8"
    >
      {!isModal && renderBookingStepper(false, fullStepperRef)}

      {requiresPartnerSetup ? (
        renderPartnerSetup()
      ) : (
      <AnimatePresence mode="wait">
        {bookingStep === 1 && (
          <motion.div
            key="step-1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24 }}
            className={isModal ? "" : "rounded-[30px] bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
          >
            {renderRouteAssistant()}
          </motion.div>
        )}

        {bookingStep === 2 && (
          <motion.div
            key="step-2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24 }}
            className={isModal ? "" : "rounded-[30px] bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
          >
            {renderPackageAssistant()}
          </motion.div>
        )}

        {bookingStep === 3 && (
          <motion.div
            key="step-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24 }}
            className={isModal ? "" : "rounded-[30px] bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
          >
            <div className="mx-auto grid max-w-3xl gap-5">
              <label className="block rounded-[22px] bg-white px-5 py-4 shadow-[0_10px_18px_rgba(140,110,78,0.06)]">
                <span className="block text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">Shipping date</span>
                <input
                  type="date"
                  value={bookingForm.shipmentDate}
                  onChange={(event) => updateBookingField("shipmentDate", event.target.value)}
                  className="mt-3 h-12 w-full bg-transparent text-2xl font-medium text-neutral-950 outline-none"
                />
              </label>

              <div className="rounded-[24px] bg-[#fcfaf7] p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Shipping summary</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[18px] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Origin</div>
                    <div className="mt-2 text-base font-semibold text-neutral-950">
                      {bookingForm.fromCity}, {bookingForm.fromCountry}
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Destination</div>
                    <div className="mt-2 text-base font-semibold text-neutral-950">
                      {bookingForm.toCity}, {bookingForm.toCountry}
                    </div>
                  </div>
                  <div className="rounded-[18px] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Packaging</div>
                    <div className="mt-2 text-base font-semibold text-neutral-950">{bookingForm.packagingType}</div>
                  </div>
                  <div className="rounded-[18px] bg-white p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Chargeable weight</div>
                    <div className="mt-2 text-base font-semibold text-neutral-950">{formatWeight(quotePricing.chargeableWeight)}</div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {quoteHighlights.map((item) => (
                    <PricingPill key={`summary-${item}`} label={item} />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleTransferSubmission}
                disabled={feedbackModal.loading || transferSubmitted}
                className="inline-flex min-h-[54px] items-center justify-center rounded-[12px] bg-ember px-6 text-base font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {feedbackModal.loading ? "Submitting request..." : "Request shipping"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      )}
    </motion.div>
  );

  const renderTrackTab = () => (
    <motion.div
      key="track"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="grid gap-8 p-5 md:p-8 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]"
    >
      <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(140,110,78,0.06)]">
        <SectionBadge label="Tracking" />
        <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Find your shipment</h2>
        <div className="mt-5 flex flex-col gap-3">
          <input
            value={trackingInput}
            onChange={(event) => setTrackingInput(normalizeTrackingNumber(event.target.value))}
            placeholder="Enter tracking number"
            className="h-12 w-full rounded-full border border-black/8 bg-white px-5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-300"
          />
          <button
            type="button"
            onClick={handleTrackShipment}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-ember px-6 text-sm font-medium text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)]"
          >
            Track Shipment
          </button>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(140,110,78,0.06)]">
        {trackingLookupLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] bg-[#fcfaf7] p-6 text-center text-sm leading-7 text-neutral-600">
            Checking your shipment status...
          </div>
        ) : trackingResult ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionBadge label="Shipment Details" />
                <h2 className="mt-3 text-2xl font-semibold text-neutral-950">{trackingResult.ref}</h2>
              </div>
              <span
                className={[
                  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]",
                  statusClasses(trackingResult.status)
                ].join(" ")}
              >
                {formatShipmentStatusLabel(trackingResult.status)}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[20px] bg-[#fcfaf7] p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Route</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">
                  {trackingResult.origin} {"->"} {trackingResult.destination}
                </div>
              </div>
              <div className="rounded-[20px] bg-[#fcfaf7] p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Estimated delivery</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">{trackingResult.eta}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] bg-[#fcfaf7] p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Latest update</div>
              <div className="mt-2 text-sm leading-7 text-neutral-700">{trackingResult.lastUpdate}</div>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-5">
              {shipmentSteps.map((step, index) => (
                <div key={step} className="flex items-center justify-between gap-3 rounded-[18px] bg-[#fcfaf7] p-4">
                  <div className="flex-1 text-sm font-medium text-neutral-700">{formatShipmentStatusLabel(step)}</div>
                  <TrackingStatusMarker complete={index <= activeStepIndex} />
                </div>
              ))}
            </div>
          </>
        ) : !trackingLookupStarted ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] bg-[#fcfaf7] p-6 text-center text-sm leading-7 text-neutral-600">
            Enter a tracking number to get started.
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] bg-[#fcfaf7] p-6 text-center text-sm leading-7 text-neutral-600">
            No shipment matches that number.
          </div>
        )}
      </div>
    </motion.div>
  );

  const renderRecentShipmentsSection = () => (
    <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:p-8">
      <div>
        <SectionBadge label="Recent Shipments" />
        <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Recent shipments</h2>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {shipments.slice(0, 3).map((shipment) => (
          <button
            key={shipment.ref}
            type="button"
            onClick={() => {
              router.push(`/dashboard/track?ref=${encodeURIComponent(shipment.ref)}`);
            }}
            className="rounded-[24px] bg-[#fcfaf7] p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors hover:bg-orange-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-neutral-950">{shipment.ref}</div>
              <span
                className={[
                  "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                  statusClasses(shipment.status)
                ].join(" ")}
              >
                {formatShipmentStatusLabel(shipment.status)}
              </span>
            </div>
            <div className="mt-3 text-sm text-neutral-700">{shipment.customer}</div>
            <div className="mt-2 text-sm text-neutral-600">
              {shipment.origin} {"->"} {shipment.destination}
            </div>
            <div className="mt-3 text-xs uppercase tracking-[0.18em] text-neutral-500">ETA {shipment.eta}</div>
          </button>
        ))}
      </div>
    </section>
  );

  const renderShipmentRequestsSection = () => (
    <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:p-8">
      <div>
        <SectionBadge label="Shipment Requests" />
        <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Requests and payments</h2>
      </div>

      <div className="mt-6 grid gap-4">
        {visiblePaymentRequests.length === 0 ? (
          <div className="rounded-[24px] bg-[#fcfaf7] p-5 text-sm leading-7 text-neutral-600">
            No shipment requests yet.
          </div>
        ) : (
          visiblePaymentRequests.map((request) => (
            <div key={request.id} className="rounded-[24px] bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">{request.id}</div>
                  <div className="mt-2 text-xl font-semibold text-neutral-950">{request.serviceTitle || "Shipment inquiry"}</div>
                  <div className="mt-2 text-sm text-neutral-600">
                    {request.origin} {"->"} {request.destination}
                  </div>
                </div>
                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <span
                    className={[
                      "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                      requestStatusClasses(request.status)
                    ].join(" ")}
                  >
                    {request.status}
                  </span>
                  <div className="text-lg font-semibold text-neutral-950">
                    {request.status === "Inquiry received" || (request.amount <= 0 && request.status !== "Approved")
                      ? "Quote pending"
                      : formatCurrency(request.amount)}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <div className="rounded-[18px] bg-[#fcfaf7] p-4 text-sm leading-6 text-neutral-700">
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Admin note</div>
                  <div className="mt-2">{request.note || "Waiting for Swift Signate to review your inquiry."}</div>
                </div>

                <div className="rounded-[18px] bg-[#fcfaf7] p-4 text-sm leading-6 text-neutral-700">
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Payment details</div>
                  <div className="mt-2">{request.bankName || "Bank will appear after Swift Signate sends your quote."}</div>
                  <div>{request.accountNumber || "Account number will appear here."}</div>
                  <div>{request.accountName || "Account name will appear here."}</div>
                  {request.invoiceNumber && (
                    <div className="mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                      Invoice: {request.invoiceNumber}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {request.status === "Quote sent" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openRequestWorkflow(request)}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-orange-200 bg-orange-50/40 px-4 text-sm font-semibold text-ember"
                      >
                        {activeRequestWorkflowId === request.id ? "Hide request" : "Open request"}
                      </button>
                      <div className="rounded-[14px] bg-[#fcfaf7] px-4 py-3 text-sm text-neutral-600">
                        {requestHasCompleteContacts(request.details)
                          ? "Contacts saved. Upload payment proof."
                          : "Save contact details to upload proof."}
                      </div>
                    </>
                  ) : request.status === "Approved" && request.shipmentRef ? (
                    <Link
                      href={`/dashboard/track?ref=${encodeURIComponent(request.shipmentRef)}`}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] bg-ember px-4 text-sm font-semibold text-white"
                    >
                      Open tracking
                    </Link>
                  ) : (
                    <div className="rounded-[14px] bg-[#fcfaf7] px-4 py-3 text-sm text-neutral-600">
                      {request.status === "Inquiry received"
                        ? "Waiting for quote"
                        : request.status === "Payment submitted" || request.status === "Awaiting verification"
                          ? "Payment proof uploaded"
                          : request.status === "Rejected"
                            ? "Check admin note"
                            : "Awaiting update"}
                    </div>
                  )}

                  {request.paymentProofName && (
                    <div className="rounded-[14px] bg-[#fcfaf7] px-4 py-3 text-sm text-neutral-700">
                      Proof: <span className="font-medium text-neutral-950">{request.paymentProofName}</span>
                    </div>
                  )}
                </div>
              </div>
              {renderQuotedRequestWorkflow(request)}
            </div>
          ))
        )}
      </div>
    </section>
  );

  const ShellTag = isModal ? "div" : "main";

  return (
    <ShellTag className={isModal ? "w-full overflow-x-hidden bg-white" : "min-h-screen overflow-x-hidden bg-[#f7f4ef]"}>
      {!isModal && (
        <header className="w-full border-b border-black/8 bg-white/94 shadow-[0_12px_24px_rgba(140,110,78,0.05)] backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 md:px-6 md:py-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/" className="flex items-center gap-3">
                <LogoMark mediaSrc={content.navigation.logoMedia} />
                <span className="text-sm font-medium text-neutral-700">Swift Signate</span>
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2">
                {!isLockedToSingleTab && isUserAuthenticated ? (
                  <>
                    <div className="rounded-full bg-[#fcfaf7] px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-600">
                      {currentUser?.name}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void signOut();
                        router.push("/");
                      }}
                      className="rounded-full bg-[#fcfaf7] px-4 py-2 text-sm text-neutral-700 transition-colors hover:text-neutral-950"
                    >
                      Sign Out
                    </button>
                  </>
                ) : !isLockedToSingleTab ? (
                  <Link
                    href="/auth?next=%2Fdashboard%2Ftrack"
                    className="rounded-full bg-[#fcfaf7] px-4 py-2 text-sm text-neutral-700 transition-colors hover:text-neutral-950"
                  >
                    Log In
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className="rounded-full bg-[#fcfaf7] px-4 py-2 text-sm text-neutral-700 transition-colors hover:text-neutral-950"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          </div>
        </header>
      )}

      <div className={isModal ? "w-full" : "mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8"}>
        {isModal ? (
          <div
            className={[
              "flex flex-col gap-4 px-5 pb-0 pt-5 md:px-8 md:pt-6",
              activeTab === "book" ? "sm:flex-row sm:items-center sm:justify-between" : "sm:flex-row sm:items-center sm:justify-end"
            ].join(" ")}
          >
            {activeTab === "book" && (
              <div className="order-2 min-w-0 w-full sm:order-1 sm:flex-1">
                {renderBookingStepper(true, compactStepperRef)}
              </div>
            )}
            <div className="order-1 flex w-full flex-wrap items-center justify-end gap-2 sm:order-2 sm:w-auto">
              <Link
                href={modalDashboardHref}
                className="rounded-full border border-orange-200 bg-orange-50/50 px-4 py-2 text-sm font-medium text-ember transition-colors hover:border-orange-300"
              >
                Dashboard
              </Link>
              {isUserAuthenticated && (
                <>
                  <div className="hidden rounded-full border border-black/8 bg-white px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-600 md:inline-flex">
                    {currentUser?.name}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      void signOut();
                      if (isModal && onClose) {
                        onClose();
                      }
                    }}
                    className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950"
                  >
                    Sign Out
                  </button>
                </>
              )}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        ) : (
          <header className="rounded-[28px] bg-white px-5 py-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:px-8 md:py-6">
            <div className="max-w-3xl">
              <SectionBadge label="Customer Services" />
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-[2.8rem]">
                {pageTitle}
              </h1>
              <p className="mt-3 text-base leading-7 text-neutral-600">
                {pageCopy}
              </p>
            </div>
          </header>
        )}

        {!isModal && showCustomerWorkspace && renderRecentShipmentsSection()}
        {!isModal && showCustomerWorkspace && renderShipmentRequestsSection()}

        <section
          className={
            isModal
              ? "bg-white px-5 pb-5 pt-3 md:px-8 md:pb-8 md:pt-4"
              : "mt-6 rounded-[28px] bg-white p-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:p-8"
          }
        >
          {!isModal && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {!isLockedToSingleTab && (
                <div className="inline-flex rounded-full bg-[#fcfaf7] p-1">
                  {[
                    { id: "book", label: "Book a Shipment" },
                    { id: "track", label: "Track Shipment" }
                  ].map((tab) => {
                    const selected = activeTab === tab.id;
                    const sharedClassName = [
                      "rounded-full px-5 py-3 text-sm font-medium transition-all",
                      selected
                        ? "bg-white text-neutral-950 shadow-[0_10px_18px_rgba(140,110,78,0.12)]"
                        : "text-neutral-600 hover:text-neutral-950"
                    ].join(" ");

                    return (
                      <Link
                        key={tab.id}
                        href={tab.id === "book" ? "/dashboard/book" : "/dashboard/track"}
                        className={sharedClassName}
                      >
                        {tab.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {notice && (
            <div className={`${isModal ? "" : "mt-5 "}rounded-[18px] bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700`}>
              {notice}
            </div>
          )}

          {showCustomerWorkspace && visibleCustomerUpdates.length > 0 && (
            <div className={`${notice ? "mt-4" : isModal ? "mt-4" : "mt-5"} space-y-3`}>
              {visibleCustomerUpdates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-[22px] bg-[#fcfaf7] px-4 py-4 md:px-5"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Customer update</div>
                      <div className="mt-2 text-base font-semibold text-neutral-950">{update.title}</div>
                      <div className="mt-2 text-sm leading-6 text-neutral-700">{update.message}</div>
                      <div className="mt-2 text-xs uppercase tracking-[0.16em] text-neutral-500">{update.createdAt}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCustomerUpdateDismiss(update.id)}
                    className="rounded-full bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-600 transition-colors hover:text-neutral-950"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            className={[
              notice ? "mt-5" : isModal ? "" : "mt-6",
              isModal
                ? ""
                : "overflow-hidden rounded-[26px] bg-[#fcfaf7] shadow-[0_12px_24px_rgba(140,110,78,0.06)]"
            ].join(" ")}
          >
            <AnimatePresence mode="wait">{activeTab === "book" ? renderBookTab() : renderTrackTab()}</AnimatePresence>
          </div>
        </section>

        <AnimatePresence>
          {feedbackModal.open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/25 px-4"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.22 }}
                className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-[0_30px_80px_rgba(10,10,10,0.18)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Request update</div>
                    <h3 className="mt-3 text-2xl font-semibold text-neutral-950">{feedbackModal.title}</h3>
                  </div>
                  {!feedbackModal.loading && (
                    <button
                      type="button"
                      onClick={closeFeedbackModal}
                      className="rounded-full border border-black/8 bg-white px-3 py-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-600"
                    >
                      Close
                    </button>
                  )}
                </div>
                <div className="mt-4 text-sm leading-7 text-neutral-700">{feedbackModal.message}</div>
                {feedbackModal.loading ? (
                  <div className="mt-6 flex items-center gap-3 text-sm text-neutral-600">
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-orange-200 border-t-ember" />
                    Processing your request
                  </div>
                ) : (
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={closeFeedbackModal}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] bg-ember px-5 text-sm font-semibold text-white"
                    >
                      Continue
                    </button>
                    {!isModal && trackingQuery && activeTab === "book" && (
                      <Link
                        href={`/dashboard/track?ref=${encodeURIComponent(trackingQuery)}`}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
                      >
                        Open tracking
                      </Link>
                    )}
                    {isModal && (
                      <Link
                        href={modalDashboardHref}
                        className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-black/10 bg-white px-5 text-sm font-medium text-neutral-700"
                      >
                        Dashboard
                      </Link>
                    )}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {!isModal && <SiteFooter />}
    </ShellTag>
  );
}
