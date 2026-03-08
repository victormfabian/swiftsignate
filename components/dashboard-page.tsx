"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AuthPanel } from "@/components/auth-panel";
import { useAuthSession } from "@/components/auth-session";
import { LogoMark } from "@/components/logo-mark";
import { getShipmentSteps, useShipmentStore } from "@/components/shipment-store";
import { useSiteContentStore } from "@/components/site-content-store";
import type { BookingRecordDetails } from "@/lib/shipment-model";

type DashboardTab = "book" | "track";
type BookingStep = 1 | 2 | 3 | 4 | 5;
type ShipperType = "private" | "business";
type WeightUnit = "kg" | "lb";
type DimensionUnit = "cm" | "in";
type CheckoutPaymentMethod = "transfer" | "paystack" | "";
type QuoteSort = "fastest" | "lowest" | "premium";
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

type QuoteOption = {
  id: string;
  title: string;
  etaHeadline: string;
  etaDetail: string;
  pickupNote: string;
  operator: string;
  price: number;
};

const CUSTOMER_EMAIL_KEY = "swift-signate-customer-email";

const COUNTRY_OPTIONS = [
  "Nigeria",
  "Ghana",
  "Kenya",
  "South Africa",
  "United Arab Emirates",
  "United States of America",
  "United Kingdom",
  "Canada",
  "Germany"
];

const ORIGIN_SUGGESTIONS = ["Nigeria", "Ghana", "Kenya", "South Africa"];
const DESTINATION_SUGGESTIONS = [
  "United States of America",
  "United Kingdom",
  "United Arab Emirates",
  "Canada"
];
const CITY_SUGGESTIONS: Record<string, string[]> = {
  "United States of America": ["New York", "Houston", "Atlanta"],
  "United Kingdom": ["London", "Manchester", "Birmingham"],
  "United Arab Emirates": ["Dubai", "Abu Dhabi", "Sharjah"],
  Canada: ["Toronto", "Vancouver", "Calgary"],
  Nigeria: ["Lagos", "Abuja", "Port Harcourt"],
  Ghana: ["Accra", "Kumasi", "Tema"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu"],
  Germany: ["Berlin", "Hamburg", "Frankfurt"]
};
const PACKAGE_COUNT_SUGGESTIONS = [1, 2, 3, 4];

const PACKAGING_OPTIONS = [
  { value: "Your Packaging", tone: "custom" },
  { value: "Document Envelope", tone: "envelope" },
  { value: "Standard Box", tone: "box" },
  { value: "Large Carton", tone: "carton" },
  { value: "Palletized Freight", tone: "pallet" }
] as const;

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
  shipperType: "",
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

const EMPTY_TRANSFER_PROOF: TransferProof = {
  name: "",
  type: "",
  dataUrl: ""
};

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

function SectionBadge({ label }: { label: string }) {
  return <div className="text-xs font-medium uppercase tracking-[0.18em] text-ember">{label}</div>;
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
      className="flex items-stretch gap-4 overflow-x-auto px-1 pb-3 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

const laneCardClassName =
  "w-[calc(100vw-2.75rem)] max-w-[420px] shrink-0 snap-start rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_24px_rgba(140,110,78,0.05)] md:min-w-[340px]";
const laneWideCardClassName =
  "w-[calc(100vw-2.75rem)] shrink-0 snap-start rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_24px_rgba(140,110,78,0.05)] md:min-w-[680px] md:max-w-[920px]";
const laneInputClassName =
  "h-13 w-full rounded-[16px] border border-black/10 bg-white px-4 text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400 focus:border-orange-300";
const contactCardClassName =
  "rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]";
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

function scrollLaneToChild(lane: HTMLDivElement | null, index: number) {
  if (!lane) {
    return;
  }

  const target = lane.children.item(index) as HTMLElement | null;
  if (!target) {
    return;
  }

  lane.scrollTo({
    left: target.offsetLeft - lane.offsetLeft,
    behavior: "smooth"
  });
}

function scrollStepperToStep(container: HTMLDivElement | null, step: BookingStep) {
  if (!container) {
    return;
  }

  const target = container.querySelector(`[data-step="${step}"]`) as HTMLElement | null;
  if (!target) {
    return;
  }

  const nextLeft = Math.max(target.offsetLeft - (container.clientWidth - target.clientWidth) / 2, 0);
  container.scrollTo({
    left: nextLeft,
    behavior: "smooth"
  });
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2
  }).format(value);
}

function formatShipmentDate() {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function buildQuoteOptions(form: BookingForm, packages: PackageEntry[], sort: QuoteSort) {
  const weightMultiplier = form.weightUnit === "lb" ? 0.453592 : 1;
  const dimensionMultiplier = form.dimensionUnit === "in" ? 2.54 : 1;
  const packageCount = Math.max(packages.length, 1);
  const totalActualWeight = packages.reduce((sum, currentPackage) => {
    const normalizedWeight = (Number(currentPackage.weight) || 0) * weightMultiplier;

    return sum + Math.max(normalizedWeight, 0.5);
  }, 0);
  const totalVolumetricWeight = packages.reduce((sum, currentPackage) => {
    const length = Math.max((Number(currentPackage.length) || 1) * dimensionMultiplier, 1);
    const width = Math.max((Number(currentPackage.width) || 1) * dimensionMultiplier, 1);
    const height = Math.max((Number(currentPackage.height) || 1) * dimensionMultiplier, 1);

    return sum + (length * width * height) / 5000;
  }, 0);
  const chargeableWeight = Math.max(totalActualWeight, totalVolumetricWeight);

  const routeFactorMap: Record<string, number> = {
    Nigeria: 1,
    Ghana: 1.05,
    Kenya: 1.16,
    "South Africa": 1.18,
    "United Arab Emirates": 1.22,
    "United States of America": 1.45,
    "United Kingdom": 1.34,
    Canada: 1.38,
    Germany: 1.3
  };

  const routeFactor = routeFactorMap[form.toCountry] ?? 1.2;
  const shipperMarkup = form.shipperType === "business" ? 180000 : 0;
  const documentsDiscount = form.packagingType === "Document Envelope" ? 160000 : 0;
  const liabilitySurcharge = form.higherLiability ? packageCount * 95000 : 0;
  const base = chargeableWeight * 235000 * routeFactor + shipperMarkup + liabilitySurcharge - documentsDiscount;

  const options: QuoteOption[] = [
    {
      id: "express-priority",
      title: "Swift Express Priority",
      etaHeadline: "Thu, 12 Mar",
      etaDetail: "latest by 12:00 pm",
      pickupNote: "Book today before 2:00 pm for same-day pickup scheduling.",
      operator: "Operated by Swift Signate Air",
      price: base + 780000.55
    },
    {
      id: "express-economy",
      title: "Swift Express Saver",
      etaHeadline: "Thu, 12 Mar",
      etaDetail: "latest by end of day",
      pickupNote: "Book today before 2:00 pm for next available line-haul dispatch.",
      operator: "Operated by Swift Signate Express",
      price: base + 642000.25
    },
    {
      id: "freight-value",
      title: "Swift Freight Value",
      etaHeadline: "Fri, 13 Mar",
      etaDetail: "before 6:00 pm",
      pickupNote: "Economy freight option with scheduled consolidation handling.",
      operator: "Operated by Swift Signate Cargo",
      price: base + 518000.1
    }
  ];

  if (sort === "lowest") {
    return [...options].sort((left, right) => left.price - right.price);
  }

  if (sort === "premium") {
    return [...options].sort((left, right) => right.price - left.price);
  }

  return options;
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

function PackagingIllustration({ type }: { type: BookingForm["packagingType"] }) {
  const option = PACKAGING_OPTIONS.find((item) => item.value === type) ?? PACKAGING_OPTIONS[0];

  switch (option.tone) {
    case "envelope":
      return (
        <svg viewBox="0 0 120 90" className="h-20 w-24" fill="none">
          <rect x="18" y="18" width="84" height="54" rx="8" fill="#fff7ed" stroke="#fdba74" strokeWidth="2" />
          <path d="M18 26 60 50 102 26" stroke="#f97316" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M18 63 46 43M102 63 74 43" stroke="#fed7aa" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 120 90" className="h-20 w-24" fill="none">
          <path d="M26 30 60 18l34 12-34 14-34-14Z" fill="#fdba74" stroke="#f59e0b" strokeWidth="2" />
          <path d="M26 30v30l34 14V44L26 30Z" fill="#f97316" stroke="#ea580c" strokeWidth="2" />
          <path d="M60 44v30l34-14V30L60 44Z" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
        </svg>
      );
    case "carton":
      return (
        <svg viewBox="0 0 120 90" className="h-20 w-24" fill="none">
          <path d="M18 34 60 20l42 14-42 18-42-18Z" fill="#fed7aa" stroke="#f59e0b" strokeWidth="2" />
          <path d="M18 34v28l42 18V52L18 34Z" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
          <path d="M60 52v28l42-18V34L60 52Z" fill="#fdba74" stroke="#ea580c" strokeWidth="2" />
          <path d="M48 26 70 36" stroke="#fff7ed" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );
    case "pallet":
      return (
        <svg viewBox="0 0 120 90" className="h-20 w-24" fill="none">
          <rect x="22" y="20" width="30" height="24" rx="4" fill="#fb923c" stroke="#ea580c" strokeWidth="2" />
          <rect x="52" y="16" width="34" height="28" rx="4" fill="#fdba74" stroke="#f59e0b" strokeWidth="2" />
          <rect x="30" y="44" width="58" height="10" rx="3" fill="#7c5c34" />
          <rect x="24" y="56" width="70" height="6" rx="2" fill="#a16207" />
          <rect x="28" y="62" width="8" height="10" rx="2" fill="#7c5c34" />
          <rect x="56" y="62" width="8" height="10" rx="2" fill="#7c5c34" />
          <rect x="82" y="62" width="8" height="10" rx="2" fill="#7c5c34" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 90" className="h-20 w-24" fill="none">
          <path d="M28 46c0-16 13-29 29-29h10c14 0 25 11 25 25 0 13-10 23-23 25l-1 10-12-10c-16-2-28-15-28-31Z" fill="#fff7ed" stroke="#fdba74" strokeWidth="2" />
          <path d="M54 37h18M54 47h12" stroke="#f97316" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
  }
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
    customerUpdates,
    bookShipment,
    submitTransferRequest,
    markCustomerUpdateRead
  } = useShipmentStore();
  const { currentUser, isUserAuthenticated, loading: authLoading, refreshSession, signOut } = useAuthSession();
  const { content } = useSiteContentStore();
  const shipmentSteps = getShipmentSteps();
  const router = useRouter();
  const isModal = displayMode === "modal";
  const isLockedToSingleTab = Boolean(lockedTab);

  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab);
  const [bookingStep, setBookingStep] = useState<BookingStep>(1);
  const [quoteSort, setQuoteSort] = useState<QuoteSort>("fastest");
  const [notice, setNotice] = useState("");
  const [trackingInput, setTrackingInput] = useState(initialTrackingRef ?? "SS-2026-100001");
  const [trackingQuery, setTrackingQuery] = useState(initialTrackingRef ?? "SS-2026-100001");
  const [bookingForm, setBookingForm] = useState<BookingForm>(INITIAL_BOOKING_FORM);
  const [packageEntries, setPackageEntries] = useState<PackageEntry[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<QuoteOption | null>(null);
  const [senderDetails, setSenderDetails] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [receiverDetails, setReceiverDetails] = useState<ContactDetails>(EMPTY_CONTACT_DETAILS);
  const [paymentMethod, setPaymentMethod] = useState<CheckoutPaymentMethod>("");
  const [transferSubmitted, setTransferSubmitted] = useState(false);
  const [transferProof, setTransferProof] = useState<TransferProof>(EMPTY_TRANSFER_PROOF);
  const [savedCustomerEmail, setSavedCustomerEmail] = useState("");
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
  const previousRouteProgressRef = useRef(0);
  const previousPackageProgressRef = useRef(0);

  const trackingResult = shipments.find((shipment) =>
    shipment.ref.toLowerCase().includes(trackingQuery.trim().toLowerCase()) ||
    shipment.airWaybill.toLowerCase().includes(trackingQuery.trim().toLowerCase())
  );
  const activeStepIndex = trackingResult
    ? shipmentSteps.findIndex((step) => step === trackingResult.status)
    : -1;
  const visibleCustomerUpdates = customerUpdates.filter(
    (update) => update.customerEmail.toLowerCase() === savedCustomerEmail.toLowerCase() && !update.read
  );
  const bookingStepLabels = [
    { step: 1 as BookingStep, label: content.customerPages.stepLabels.route },
    { step: 2 as BookingStep, label: content.customerPages.stepLabels.shipment },
    { step: 3 as BookingStep, label: content.customerPages.stepLabels.delivery },
    { step: 4 as BookingStep, label: content.customerPages.stepLabels.contact },
    { step: 5 as BookingStep, label: content.customerPages.stepLabels.payment }
  ];

  const quoteOptions = buildQuoteOptions(bookingForm, packageEntries, quoteSort);
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
    packageEntries.every(
      (entry) => entry.weight.trim() && entry.length.trim() && entry.width.trim() && entry.height.trim()
    );
  const senderRequired = [
    senderDetails.name,
    senderDetails.email,
    senderDetails.phone,
    senderDetails.address1,
    senderDetails.city
  ].every((value) => value.trim());
  const receiverRequired = [
    receiverDetails.name,
    receiverDetails.email,
    receiverDetails.phone,
    receiverDetails.address1,
    receiverDetails.city,
    receiverDetails.postalCode
  ].every((value) => value.trim());
  const contactStepComplete = senderRequired && receiverRequired;
  const routeProgressIndex =
    bookingForm.fromCountry &&
    bookingForm.fromCity &&
    bookingForm.toCountry &&
    bookingForm.toCity &&
    bookingForm.fromCountry !== bookingForm.toCountry
      ? 3
      : bookingForm.shipperType && bookingForm.fromCountry && bookingForm.fromCity
        ? 2
      : bookingForm.shipperType
        ? 1
          : 0;
  const packageProgressIndex =
    packageEntries.length > 0 && bookingForm.higherLiability !== null && bookingForm.packagingType
      ? 3
      : bookingForm.higherLiability !== null && bookingForm.packagingType
        ? 2
        : bookingForm.packagingType
          ? 1
          : 0;
  const pageTitle =
    activeTab === "book" ? content.customerPages.bookTitle : content.customerPages.trackTitle;
  const pageCopy =
    activeTab === "book" ? content.customerPages.bookCopy : content.customerPages.trackCopy;
  const pageHelper =
    activeTab === "book" ? content.customerPages.bookHelper : content.customerPages.trackHelper;

  useEffect(() => {
    setActiveTab(lockedTab ?? initialTab);
  }, [initialTab, lockedTab]);

  useEffect(() => {
    if (!initialTrackingRef) {
      return;
    }

    const normalizedRef = initialTrackingRef.toUpperCase();
    setTrackingInput(normalizedRef);
    setTrackingQuery(normalizedRef);
    if (lockedTab !== "book") {
      setActiveTab("track");
    }
  }, [initialTrackingRef, lockedTab]);

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
    setSenderDetails((current) => ({
      ...current,
      name: current.name || currentUser.name,
      email: current.email || currentUser.email,
      phone: current.phone || currentUser.phone
    }));
  }, [currentUser]);

  useEffect(() => {
    previousRouteProgressRef.current = 0;
    previousPackageProgressRef.current = 0;
  }, [bookingStep]);

  useEffect(() => {
    if (bookingStep !== 1 || routeProgressIndex <= previousRouteProgressRef.current) {
      previousRouteProgressRef.current = routeProgressIndex;
      return;
    }

    if (typeof window === "undefined" || window.innerWidth >= 768 || !routeLaneRef.current) {
      previousRouteProgressRef.current = routeProgressIndex;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollLaneToChild(routeLaneRef.current, routeProgressIndex);
    });

    previousRouteProgressRef.current = routeProgressIndex;
    return () => window.cancelAnimationFrame(frameId);
  }, [bookingStep, routeProgressIndex]);

  useEffect(() => {
    if (bookingStep !== 2 || packageProgressIndex <= previousPackageProgressRef.current) {
      previousPackageProgressRef.current = packageProgressIndex;
      return;
    }

    if (typeof window === "undefined" || window.innerWidth >= 768 || !packageLaneRef.current) {
      previousPackageProgressRef.current = packageProgressIndex;
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollLaneToChild(packageLaneRef.current, packageProgressIndex);
    });

    previousPackageProgressRef.current = packageProgressIndex;
    return () => window.cancelAnimationFrame(frameId);
  }, [bookingStep, packageProgressIndex]);

  useEffect(() => {
    if (activeTab !== "book" || typeof window === "undefined") {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      scrollStepperToStep(fullStepperRef.current, bookingStep);
      scrollStepperToStep(compactStepperRef.current, bookingStep);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [activeTab, bookingStep]);

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
    setSelectedQuote(null);
    setSenderDetails(
      currentUser
        ? {
            ...EMPTY_CONTACT_DETAILS,
            name: currentUser.name,
            email: currentUser.email,
            phone: currentUser.phone
          }
        : EMPTY_CONTACT_DETAILS
    );
    setReceiverDetails(EMPTY_CONTACT_DETAILS);
    setPaymentMethod("");
    setTransferSubmitted(false);
    setTransferProof(EMPTY_TRANSFER_PROOF);
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
      missing.push("pickup country");
    }
    if (!bookingForm.fromCity.trim()) {
      missing.push("pickup city");
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
      if (!entry.length.trim()) {
        packageMissing.push("length");
      }
      if (!entry.width.trim()) {
        packageMissing.push("width");
      }
      if (!entry.height.trim()) {
        packageMissing.push("height");
      }

      if (packageMissing.length > 0) {
        missing.push(`package ${index + 1} ${formatMissingFields(packageMissing)}`);
      }
    });

    if (missing.length === 0) {
      return "";
    }

    return `Complete ${formatMissingFields(missing)} before viewing delivery options.`;
  };

  const getContactValidationMessage = () => {
    const missing: string[] = [];

    if (!senderDetails.name.trim()) {
      missing.push("sender name");
    }
    if (!senderDetails.email.trim()) {
      missing.push("sender email");
    }
    if (!senderDetails.phone.trim()) {
      missing.push("sender phone");
    }
    if (!senderDetails.address1.trim()) {
      missing.push("sender address");
    }
    if (!senderDetails.city.trim()) {
      missing.push("sender city");
    }
    if (!receiverDetails.name.trim()) {
      missing.push("receiver name");
    }
    if (!receiverDetails.email.trim()) {
      missing.push("receiver email");
    }
    if (!receiverDetails.phone.trim()) {
      missing.push("receiver phone");
    }
    if (!receiverDetails.address1.trim()) {
      missing.push("receiver address");
    }
    if (!receiverDetails.city.trim()) {
      missing.push("receiver city");
    }
    if (!receiverDetails.postalCode.trim()) {
      missing.push("receiver postal code");
    }

    if (missing.length === 0) {
      return "";
    }

    return `Complete ${formatMissingFields(missing)} before continuing to payment.`;
  };

  const handleTransferProofChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setTransferProof(EMPTY_TRANSFER_PROOF);
      return;
    }

    const maxSize = 1.5 * 1024 * 1024;
    const allowed = file.type.startsWith("image/") || file.type === "application/pdf";
    if (!allowed) {
      setNotice("Upload a payment proof as an image or PDF receipt.");
      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setNotice("Payment proof must be 1.5 MB or smaller in this local demo.");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTransferProof({
        name: file.name,
        type: file.type,
        dataUrl: typeof reader.result === "string" ? reader.result : ""
      });
      setNotice("");
    };
    reader.onerror = () => {
      setNotice("Could not read the payment proof file. Try another file.");
    };
    reader.readAsDataURL(file);
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

  const handleContinueFromQuote = (option: QuoteOption) => {
    setSelectedQuote(option);
    setPaymentMethod("");
    setTransferSubmitted(false);
    setSenderDetails((current) => ({
      ...current,
      city: current.city || bookingForm.fromCity
    }));
    setReceiverDetails((current) => ({
      ...current,
      city: current.city || bookingForm.toCity
    }));
    setBookingStep(4);
    setNotice("");
  };

  const handleSaveShipment = () => {
    setNotice("Shipment details saved in this session. You can return and complete the booking anytime.");
  };

  const handleTrackShipment = () => {
    if (!trackingInput.trim()) {
      setNotice("Enter a tracking number or air waybill before searching.");
      return;
    }

    setNotice("");
    setTrackingQuery(trackingInput.trim().toUpperCase());
  };

  const handleCopyQuoteLink = async () => {
    const summaryLink = `${window.location.origin}/dashboard/${activeTab}`;

    try {
      await navigator.clipboard.writeText(summaryLink);
      setNotice("Quote page link copied.");
    } catch {
      setNotice("Could not copy the link automatically.");
    }
  };

  const handleEmailQuotes = () => {
    const summary = quoteOptions
      .map((option) => `${option.title}: ${formatCurrency(option.price)} - ${option.etaHeadline} ${option.etaDetail}`)
      .join("\n");

    window.location.href = `mailto:?subject=Swift%20Signate%20Delivery%20Quotes&body=${encodeURIComponent(summary)}`;
  };

  const handlePrintQuotes = () => {
    window.print();
  };

  const goToPaymentStep = () => {
    if (!selectedQuote) {
      setNotice("Select a delivery option before completing the booking details.");
      setBookingStep(3);
      return;
    }

    const validationMessage = getContactValidationMessage();
    if (validationMessage) {
      setNotice(validationMessage);
      return;
    }

    setNotice("");
    setBookingStep(5);
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
    quoteSort,
    selectedQuote: selectedQuote
      ? {
          id: selectedQuote.id,
          title: selectedQuote.title,
          etaHeadline: selectedQuote.etaHeadline,
          etaDetail: selectedQuote.etaDetail,
          pickupNote: selectedQuote.pickupNote,
          operator: selectedQuote.operator,
          price: selectedQuote.price
        }
      : null,
    payment: {
      method,
      note:
        method === "Direct transfer"
          ? `Transfer submitted for ${selectedQuote?.title ?? "selected delivery option"}`
          : "Paystack payment confirmed"
    }
  });

  const handleTransferSubmission = () => {
    if (!selectedQuote) {
      setNotice("Select a delivery option before submitting a transfer.");
      setBookingStep(3);
      return;
    }

    const validationMessage = getContactValidationMessage();
    if (validationMessage) {
      setNotice(validationMessage);
      setBookingStep(4);
      return;
    }

    if (paymentMethod !== "transfer") {
      setPaymentMethod("transfer");
    }

    if (feedbackModal.loading || transferSubmitted) {
      return;
    }

    if (!transferProof.dataUrl) {
      setNotice("Upload a receipt or screenshot of the transfer before submitting it for verification.");
      return;
    }

    setTransferSubmitted(true);
    setNotice("");
    setFeedbackModal({
      open: true,
      loading: true,
      title: "Submitting transfer",
      message: "Please wait while we notify Swift Signate finance for payment verification."
    });

    const customerEmail = senderDetails.email.trim().toLowerCase();
    const customerName =
      bookingForm.shipperType === "business"
        ? senderDetails.company.trim() || senderDetails.name.trim()
        : senderDetails.name.trim();
    const requestPayload = {
      customer: customerName,
      customerEmail,
      customerPhone: senderDetails.phone.trim(),
      origin: `${bookingForm.fromCity}, ${bookingForm.fromCountry}`,
      destination: `${bookingForm.toCity}, ${bookingForm.toCountry}`,
      eta: `${selectedQuote.etaHeadline}, ${selectedQuote.etaDetail}`,
      packageType: `${packageEntries.length} ${bookingForm.packagingType.toLowerCase()}`,
      paymentMethod: "Direct transfer" as const,
      serviceTitle: selectedQuote.title,
      amount: selectedQuote.price,
      note: `Transfer submitted for ${selectedQuote.title}`,
      paymentProofName: transferProof.name,
      paymentProofType: transferProof.type,
      paymentProofDataUrl: transferProof.dataUrl,
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
            title: "Transfer submitted",
            message:
              "Your transfer request has been sent for review. Swift Signate will update you with your tracking number and air waybill once payment is confirmed."
          });
          setNotice("Transfer submitted. You will receive the tracking number and air waybill after admin confirmation.");
        } catch {
          setTransferSubmitted(false);
          setFeedbackModal({
            open: true,
            loading: false,
            title: "Transfer submission failed",
            message: "We could not submit your transfer request right now. Please try again."
          });
          setNotice("Transfer submission failed. Please try again.");
        }
      })();
    }, 1200);
  };

  const handleConfirmPayment = () => {
    if (!selectedQuote) {
      setNotice("Select a delivery option before completing payment.");
      setBookingStep(3);
      return;
    }

    const validationMessage = getContactValidationMessage();
    if (validationMessage) {
      setNotice(validationMessage);
      setBookingStep(4);
      return;
    }

    if (!paymentMethod) {
      setNotice("Choose a payment option to continue.");
      return;
    }

    if (paymentMethod === "transfer") {
      setNotice("Submit the transfer for verification. Tracking details will be issued after admin confirmation.");
      return;
    }

    const customerEmail = senderDetails.email.trim().toLowerCase();
    const customerName =
      bookingForm.shipperType === "business"
        ? senderDetails.company.trim() || senderDetails.name.trim()
        : senderDetails.name.trim();

    setNotice("");
    setFeedbackModal({
      open: true,
      loading: true,
      title: "Confirming payment",
      message: "Please wait while Swift Signate confirms the Paystack payment and prepares your shipment numbers."
    });

    window.setTimeout(() => {
      void (async () => {
        try {
          const shipment = await bookShipment({
            customer: customerName,
            customerEmail,
            customerPhone: senderDetails.phone.trim(),
            origin: `${bookingForm.fromCity}, ${bookingForm.fromCountry}`,
            destination: `${bookingForm.toCity}, ${bookingForm.toCountry}`,
            eta: `${selectedQuote.etaHeadline}, ${selectedQuote.etaDetail}`,
            packageType: `${packageEntries.length} ${bookingForm.packagingType.toLowerCase()}`,
            paymentMethod: "Paystack",
            details: buildBookingRecordDetails("Paystack")
          });

          persistCustomerEmail(customerEmail);
          setTrackingInput(shipment.ref);
          setTrackingQuery(shipment.ref);
          resetBookingFlow();
          setFeedbackModal({
            open: true,
            loading: false,
            title: "Payment confirmed",
            message: `Tracking number ${shipment.ref} and air waybill ${shipment.airWaybill} have been issued automatically.`
          });
          setNotice(`Payment confirmed. Tracking number ${shipment.ref} and air waybill ${shipment.airWaybill} are ready.`);
        } catch {
          setFeedbackModal({
            open: true,
            loading: false,
            title: "Payment confirmation failed",
            message: "We could not confirm the Paystack payment right now. Please try again."
          });
          setNotice("Payment confirmation failed. Please try again.");
        }
      })();
    }, 1200);
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
      return;
    }

    if (step === 4 && selectedQuote) {
      setBookingStep(4);
      return;
    }

    if (step === 5 && selectedQuote && contactStepComplete) {
      setBookingStep(5);
    }
  };

  if (authLoading) {
    return (
      <div className={isModal ? "bg-white p-8" : "min-h-screen bg-white px-4 py-8"}>
        <div className="mx-auto flex max-w-3xl items-center justify-center rounded-[28px] border border-black/8 bg-white p-8 text-sm text-neutral-600 shadow-[0_18px_40px_rgba(140,110,78,0.08)]">
          Checking your secure session...
        </div>
      </div>
    );
  }

  if (!isUserAuthenticated) {
    return (
      <AuthPanel
        role="user"
        mode={isModal ? "modal" : "page"}
        title={activeTab === "track" ? "Sign in to track your shipment" : "Sign in to book and manage shipments"}
        copy="Create an account or sign in before using the Swift Signate customer workspace."
        nextPath={activeTab === "track" ? "/dashboard/track" : "/dashboard/book"}
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
          <div className="text-base font-semibold text-neutral-950">Shipping as</div>
          <div className="mt-4 flex flex-wrap gap-3">
            {[
              { id: "private", label: "Private Person" },
              { id: "business", label: "Business" }
            ].map((type) => {
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => updateBookingField("shipperType", type.id as ShipperType)}
                  className={laneChoiceClass(bookingForm.shipperType === type.id)}
                >
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>

        {bookingForm.shipperType && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Pickup location</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {ORIGIN_SUGGESTIONS.map((country) => (
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
              <option value="">Select pickup country</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {bookingForm.fromCountry && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {(CITY_SUGGESTIONS[bookingForm.fromCountry] ?? []).map((city) => (
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
                  placeholder="Pickup city"
                  className={laneInputClassName}
                />
              </div>
            )}
          </div>
        )}

        {bookingForm.fromCountry && bookingForm.fromCity && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">Destination</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {DESTINATION_SUGGESTIONS.map((country) => (
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
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {bookingForm.toCountry && (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-3">
                  {(CITY_SUGGESTIONS[bookingForm.toCountry] ?? []).map((city) => (
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
          bookingForm.toCity &&
          bookingForm.fromCountry !== bookingForm.toCountry && (
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
                    {PACKAGING_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.value}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </label>

            <div className="flex h-[88px] w-[120px] items-center justify-center rounded-[20px] border border-black/10 bg-white shadow-[0_10px_20px_rgba(140,110,78,0.05)]">
              <PackagingIllustration type={bookingForm.packagingType || "Your Packaging"} />
            </div>
          </div>
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

        {bookingForm.higherLiability !== null && (
          <div className={laneCardClassName}>
            <div className="text-base font-semibold text-neutral-950">How many packages?</div>
            <div className="mt-4 flex flex-wrap gap-3">
              {PACKAGE_COUNT_SUGGESTIONS.map((count) => (
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
                      <span className="text-sm font-medium text-neutral-800">Dimensions</span>
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
          See Delivery Options
        </button>
      </div>
    </div>
  );

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
            className={isModal ? "" : "rounded-[30px] border border-black/8 bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
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
            <h2 className="text-3xl font-semibold text-neutral-950 md:text-5xl">Your Delivery Options</h2>
            <p className="mt-3 text-base leading-7 text-neutral-600">
              Review and select a delivery service to complete the shipment booking.
            </p>

            <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-stretch">
              <label className="rounded-[18px] border border-black/8 bg-white px-4 py-3 shadow-[0_10px_18px_rgba(140,110,78,0.06)]">
                <span className="block text-sm text-neutral-600">Shipment Date</span>
                <input
                  type="date"
                  value={bookingForm.shipmentDate}
                  onChange={(event) => updateBookingField("shipmentDate", event.target.value)}
                  className="mt-1 h-12 w-full bg-transparent text-2xl font-medium text-neutral-950 outline-none"
                />
              </label>

              <label className="rounded-[18px] border border-black/8 bg-white px-4 py-3 shadow-[0_10px_18px_rgba(140,110,78,0.06)]">
                <span className="block text-sm text-neutral-600">Sort by</span>
                <select
                  value={quoteSort}
                  onChange={(event) => setQuoteSort(event.target.value as QuoteSort)}
                  className="mt-1 h-12 w-full bg-transparent text-2xl font-medium text-neutral-950 outline-none"
                >
                  <option value="fastest">Fastest delivery</option>
                  <option value="lowest">Lowest price</option>
                  <option value="premium">Premium service</option>
                </select>
              </label>

              <button
                type="button"
                onClick={handleSaveShipment}
                className="rounded-[12px] border border-ember bg-white px-8 py-4 text-lg font-semibold text-ember transition-all lg:min-h-[74px] hover:shadow-[0_10px_18px_rgba(140,110,78,0.08)]"
              >
                Save Shipment
              </button>
            </div>

            <div className="mt-8 space-y-6">
              {quoteOptions.map((option) => (
                <div
                  key={option.id}
                  className="rounded-[26px] border border-black/8 bg-white p-5 shadow-[0_14px_28px_rgba(140,110,78,0.06)] md:p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[auto_1.2fr_0.9fr] lg:items-center">
                    <div className="flex justify-center lg:justify-start">
                      <QuotePlane />
                    </div>

                    <div>
                      <div className="text-sm uppercase tracking-[0.18em] text-neutral-500">Estimated delivery</div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-neutral-950">
                        <span className="text-3xl font-semibold">{option.etaHeadline}</span>
                        <span className="text-2xl text-neutral-700">{option.etaDetail}</span>
                      </div>
                      <div className="mt-3 text-base leading-7 text-neutral-600">{option.pickupNote}</div>
                      <div className="mt-4 text-sm font-medium text-neutral-500">{option.operator}</div>
                    </div>

                    <div className="flex flex-col justify-center lg:items-end lg:text-right">
                      <div className="text-sm uppercase tracking-[0.18em] text-neutral-500">Includes VAT</div>
                      <div className="mt-3 text-4xl font-semibold text-neutral-950">{formatCurrency(option.price)}</div>
                      <button
                        type="button"
                        onClick={() => handleContinueFromQuote(option)}
                        className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-[12px] bg-ember px-8 text-lg font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)]"
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={handleEmailQuotes}
                className="rounded-[12px] border border-ember bg-white px-6 py-4 text-lg font-semibold text-ember transition-all hover:shadow-[0_10px_18px_rgba(140,110,78,0.08)]"
              >
                Email Quotes
              </button>
              <button
                type="button"
                onClick={handleCopyQuoteLink}
                className="rounded-[12px] border border-ember bg-white px-6 py-4 text-lg font-semibold text-ember transition-all hover:shadow-[0_10px_18px_rgba(140,110,78,0.08)]"
              >
                Copy link
              </button>
              <button
                type="button"
                onClick={handlePrintQuotes}
                className="rounded-[12px] border border-ember bg-white px-6 py-4 text-lg font-semibold text-ember transition-all hover:shadow-[0_10px_18px_rgba(140,110,78,0.08)]"
              >
                Print Quotes
              </button>
            </div>
          </motion.div>
        )}

        {bookingStep === 4 && selectedQuote && (
          <motion.div
            key="step-4"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24 }}
            className={isModal ? "" : "rounded-[30px] border border-black/8 bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
          >
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
              <div className="max-w-2xl">
                <h2 className="text-3xl font-semibold text-neutral-950 md:text-5xl">Contact details</h2>
                <p className="mt-3 text-base leading-7 text-neutral-600">
                  Enter the sender and receiver details for pickup and delivery before you move to payment.
                </p>
              </div>

              <div className="rounded-[22px] border border-black/8 bg-white p-4 shadow-[0_10px_18px_rgba(140,110,78,0.06)] xl:w-full">
                <div className="text-sm uppercase tracking-[0.18em] text-neutral-500">Selected service</div>
                <div className="mt-2 text-xl font-semibold text-neutral-950">{selectedQuote.title}</div>
                <div className="mt-2 text-sm text-neutral-600">
                  {selectedQuote.etaHeadline} · {selectedQuote.etaDetail}
                </div>
                <div className="mt-3 text-2xl font-semibold text-ember">{formatCurrency(selectedQuote.price)}</div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-2 xl:items-stretch">
              <div className={`${contactCardClassName} flex h-full flex-col`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="text-2xl font-semibold text-neutral-950">From</div>
                  <div className="text-sm text-neutral-500">
                    {bookingForm.fromCity}, {bookingForm.fromCountry}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Full name</span>
                    <input
                      value={senderDetails.name}
                      onChange={(event) => updateContactField("sender", "name", event.target.value)}
                      placeholder="Full name"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Company</span>
                    <input
                      value={senderDetails.company}
                      onChange={(event) => updateContactField("sender", "company", event.target.value)}
                      placeholder="Company name (optional)"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Email</span>
                    <input
                      value={senderDetails.email}
                      onChange={(event) => updateContactField("sender", "email", event.target.value)}
                      placeholder="Email address"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Phone</span>
                    <input
                      value={senderDetails.phone}
                      onChange={(event) => updateContactField("sender", "phone", event.target.value)}
                      placeholder="Phone number"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Address line 1</span>
                    <input
                      value={senderDetails.address1}
                      onChange={(event) => updateContactField("sender", "address1", event.target.value)}
                      placeholder="Address line 1"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Address line 2</span>
                    <input
                      value={senderDetails.address2}
                      onChange={(event) => updateContactField("sender", "address2", event.target.value)}
                      placeholder="Address line 2 (optional)"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>City</span>
                    <input
                      value={senderDetails.city}
                      onChange={(event) => updateContactField("sender", "city", event.target.value)}
                      placeholder="City"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Postal code</span>
                    <input
                      value={senderDetails.postalCode}
                      onChange={(event) => updateContactField("sender", "postalCode", event.target.value)}
                      placeholder="Postal code"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Country</span>
                    <input
                      value={bookingForm.fromCountry}
                      readOnly
                      className={contactReadonlyFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2 flex min-h-12 items-center gap-3 rounded-[16px] border border-black/8 px-4 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={senderDetails.residential}
                      onChange={(event) => updateContactField("sender", "residential", event.target.checked)}
                      className="h-5 w-5 rounded border border-black/20"
                    />
                    Residential address
                  </label>
                </div>
              </div>

              <div className={`${contactCardClassName} flex h-full flex-col`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div className="text-2xl font-semibold text-neutral-950">To</div>
                  <div className="text-sm text-neutral-500">
                    {bookingForm.toCity}, {bookingForm.toCountry}
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Full name</span>
                    <input
                      value={receiverDetails.name}
                      onChange={(event) => updateContactField("receiver", "name", event.target.value)}
                      placeholder="Full name"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Company</span>
                    <input
                      value={receiverDetails.company}
                      onChange={(event) => updateContactField("receiver", "company", event.target.value)}
                      placeholder="Company name (optional)"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Email</span>
                    <input
                      value={receiverDetails.email}
                      onChange={(event) => updateContactField("receiver", "email", event.target.value)}
                      placeholder="Email address"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Phone</span>
                    <input
                      value={receiverDetails.phone}
                      onChange={(event) => updateContactField("receiver", "phone", event.target.value)}
                      placeholder="Phone number"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Address line 1</span>
                    <input
                      value={receiverDetails.address1}
                      onChange={(event) => updateContactField("receiver", "address1", event.target.value)}
                      placeholder="Address line 1"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Address line 2</span>
                    <input
                      value={receiverDetails.address2}
                      onChange={(event) => updateContactField("receiver", "address2", event.target.value)}
                      placeholder="Address line 2 (optional)"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>City</span>
                    <input
                      value={receiverDetails.city}
                      onChange={(event) => updateContactField("receiver", "city", event.target.value)}
                      placeholder="City"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label>
                    <span className={contactLabelClassName}>Postal code</span>
                    <input
                      value={receiverDetails.postalCode}
                      onChange={(event) => updateContactField("receiver", "postalCode", event.target.value)}
                      placeholder="Postal code"
                      className={contactFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2">
                    <span className={contactLabelClassName}>Country</span>
                    <input
                      value={bookingForm.toCountry}
                      readOnly
                      className={contactReadonlyFieldClassName}
                    />
                  </label>
                  <label className="md:col-span-2 flex min-h-12 items-center gap-3 rounded-[16px] border border-black/8 px-4 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={receiverDetails.residential}
                      onChange={(event) => updateContactField("receiver", "residential", event.target.checked)}
                      className="h-5 w-5 rounded border border-black/20"
                    />
                    Residential address
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setBookingStep(3)}
                className="rounded-[12px] border border-black/10 bg-white px-6 py-4 text-base font-medium text-neutral-700 transition-colors hover:border-orange-200 hover:text-neutral-950"
              >
                Back to delivery options
              </button>
              <button
                type="button"
                onClick={goToPaymentStep}
                className="inline-flex min-h-[56px] items-center justify-center rounded-[12px] bg-ember px-8 text-lg font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)]"
              >
                Continue to payment
              </button>
            </div>
          </motion.div>
        )}

        {bookingStep === 5 && selectedQuote && (
          <motion.div
            key="step-5"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24 }}
            className={isModal ? "" : "rounded-[30px] border border-black/8 bg-white p-5 shadow-[0_18px_30px_rgba(140,110,78,0.06)] md:p-8"}
          >
            <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
              <div className="space-y-5">
                <div>
                  <h2 className="text-3xl font-semibold text-neutral-950 md:text-5xl">
                    {content.customerPages.paymentTitle}
                  </h2>
                  <p className="mt-3 text-base leading-7 text-neutral-600">
                    {content.customerPages.paymentCopy}
                  </p>
                </div>

                <div
                  className={[
                    "rounded-[24px] border p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                    paymentMethod === "transfer" ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white"
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-neutral-950">{content.customerPages.transferTitle}</div>
                      <div className="mt-2 text-sm leading-6 text-neutral-600">
                        {content.customerPages.transferCopy}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("transfer")}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        paymentMethod === "transfer"
                          ? "border-orange-300 bg-white text-ember"
                          : "border-black/8 bg-white text-neutral-700 hover:border-orange-200"
                      ].join(" ")}
                    >
                      {paymentMethod === "transfer" ? "Selected" : "Use transfer"}
                    </button>
                  </div>

                  {paymentMethod === "transfer" && (
                    <>
                      <div className="mt-5 grid gap-4 rounded-[20px] border border-black/8 bg-white p-4 sm:grid-cols-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Bank</div>
                          <div className="mt-2 text-base font-semibold text-neutral-950">Sterling Bank</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Account number</div>
                          <div className="mt-2 text-base font-semibold text-neutral-950">0021489031</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Account name</div>
                          <div className="mt-2 text-base font-semibold text-neutral-950">Swift Signate Logistics</div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[20px] border border-black/8 bg-white p-4">
                        <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Transfer proof</div>
                        <div className="mt-2 text-sm leading-6 text-neutral-600">
                          Upload a receipt, bank transfer slip, or payment screenshot before submitting the transfer.
                        </div>
                        <label className="mt-4 flex min-h-[54px] cursor-pointer items-center justify-center rounded-[14px] border border-dashed border-orange-300 bg-orange-50/40 px-4 text-sm font-medium text-ember">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleTransferProofChange}
                            className="hidden"
                          />
                          {transferProof.name ? "Replace payment proof" : "Upload payment proof"}
                        </label>
                        {transferProof.name && (
                          <div className="mt-3 rounded-[16px] border border-black/8 bg-[#fcfaf7] px-4 py-3 text-sm text-neutral-700">
                            Attached: <span className="font-medium text-neutral-950">{transferProof.name}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-neutral-600">
                          {transferSubmitted
                            ? "Transfer request sent. Swift Signate will update you after verification."
                            : "After making the transfer, submit it for verification so the booking can wait for admin approval."}
                        </div>
                        <button
                          type="button"
                          onClick={handleTransferSubmission}
                          disabled={feedbackModal.loading || transferSubmitted}
                          className="inline-flex min-h-[48px] items-center justify-center rounded-[12px] border border-ember bg-white px-5 text-sm font-semibold text-ember"
                        >
                          {transferSubmitted ? "Awaiting verification" : "Submit transfer for verification"}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <div
                  className={[
                    "rounded-[24px] border p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors",
                    paymentMethod === "paystack" ? "border-orange-300 bg-orange-50/40" : "border-black/8 bg-white"
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-lg font-semibold text-neutral-950">{content.customerPages.paystackTitle}</div>
                      <div className="mt-2 text-sm leading-6 text-neutral-600">
                        {content.customerPages.paystackCopy}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPaymentMethod("paystack");
                        setTransferSubmitted(false);
                      }}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                        paymentMethod === "paystack"
                          ? "border-orange-300 bg-white text-ember"
                          : "border-black/8 bg-white text-neutral-700 hover:border-orange-200"
                      ].join(" ")}
                    >
                      {paymentMethod === "paystack" ? "Selected" : "Use Paystack"}
                    </button>
                  </div>
                </div>
              </div>

              <aside className="rounded-[24px] border border-black/8 bg-white p-5 shadow-[0_10px_18px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Booking summary</div>
                <div className="mt-3 text-2xl font-semibold text-neutral-950">{selectedQuote.title}</div>
                <div className="mt-2 text-sm text-neutral-600">
                  {selectedQuote.etaHeadline} - {selectedQuote.etaDetail}
                </div>
                <div className="mt-4 text-4xl font-semibold text-ember">{formatCurrency(selectedQuote.price)}</div>

                <div className="mt-6 space-y-3 rounded-[20px] border border-black/8 bg-[#fcfaf7] p-4 text-sm text-neutral-700">
                  <div className="flex items-center justify-between gap-4">
                    <span>Route</span>
                    <span className="text-right font-medium text-neutral-950">
                      {bookingForm.fromCity}, {bookingForm.fromCountry} to {bookingForm.toCity}, {bookingForm.toCountry}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Packages</span>
                    <span className="font-medium text-neutral-950">{packageEntries.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span>Payment option</span>
                    <span className="font-medium text-neutral-950">
                      {paymentMethod === "transfer"
                        ? "Direct transfer"
                        : paymentMethod === "paystack"
                          ? "Paystack"
                          : "Not selected"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  {paymentMethod === "paystack" ? (
                    <button
                      type="button"
                      onClick={handleConfirmPayment}
                      disabled={feedbackModal.loading}
                      className="inline-flex min-h-[54px] items-center justify-center rounded-[12px] bg-ember px-6 text-base font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Confirm Paystack payment
                    </button>
                  ) : paymentMethod === "transfer" && transferSubmitted ? (
                    <div className="rounded-[18px] border border-orange-200 bg-orange-50 px-4 py-4 text-sm leading-6 text-neutral-700">
                      Transfer sent. Tracking number and air waybill will appear here after the admin confirms payment.
                    </div>
                  ) : paymentMethod === "transfer" ? (
                    <button
                      type="button"
                      onClick={handleTransferSubmission}
                      disabled={feedbackModal.loading}
                      className="inline-flex min-h-[54px] items-center justify-center rounded-[12px] bg-ember px-6 text-base font-semibold text-white shadow-[0_16px_28px_rgba(249,115,22,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Submit transfer for verification
                    </button>
                  ) : (
                    <div className="rounded-[18px] border border-black/8 bg-white px-4 py-4 text-sm leading-6 text-neutral-600">
                      Choose a payment option to continue.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setBookingStep(4)}
                    className="rounded-[12px] border border-black/10 bg-white px-6 py-4 text-sm font-medium text-neutral-700"
                  >
                    Back to contact details
                  </button>
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const renderTrackTab = () => (
    <motion.div
      key="track"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25 }}
      className="grid gap-8 p-5 md:p-8 lg:grid-cols-[0.8fr_1.2fr]"
    >
      <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(140,110,78,0.06)]">
        <SectionBadge label="Tracking" />
        <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Find your shipment</h2>
        <p className="mt-3 text-base leading-7 text-neutral-600">
          Enter the tracking number or air waybill you received after payment was confirmed.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <input
            value={trackingInput}
            onChange={(event) => setTrackingInput(event.target.value.toUpperCase())}
            placeholder="Enter tracking number or AWB"
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

        <div className="mt-6 rounded-[22px] border border-black/8 bg-white p-4 text-sm leading-7 text-neutral-600 shadow-[0_10px_18px_rgba(140,110,78,0.06)]">
          Try one of these: <span className="font-medium text-neutral-900">SS-2026-100001</span>,{" "}
          <span className="font-medium text-neutral-900">AWB-2026-100002</span>
        </div>
      </div>

      <div className="rounded-[28px] bg-white p-6 shadow-[0_14px_28px_rgba(140,110,78,0.06)]">
        {trackingResult ? (
          <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <SectionBadge label="Shipment Details" />
                <h2 className="mt-3 text-2xl font-semibold text-neutral-950">{trackingResult.ref}</h2>
                <p className="mt-2 text-sm text-neutral-600">{trackingResult.customer}</p>
                <p className="mt-1 text-sm text-neutral-500">Air waybill: {trackingResult.airWaybill}</p>
              </div>
              <span
                className={[
                  "rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em]",
                  statusClasses(trackingResult.status)
                ].join(" ")}
              >
                {trackingResult.status}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Route</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">
                  {trackingResult.origin} {"->"} {trackingResult.destination}
                </div>
              </div>
              <div className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Estimated delivery</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">{trackingResult.eta}</div>
              </div>
              <div className="rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Air waybill</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">{trackingResult.airWaybill}</div>
              </div>
            </div>

            <div className="mt-4 rounded-[20px] border border-black/8 bg-white p-4 shadow-[0_8px_16px_rgba(140,110,78,0.05)]">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Latest update</div>
              <div className="mt-2 text-sm leading-7 text-neutral-700">{trackingResult.lastUpdate}</div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              {shipmentSteps.map((step, index) => (
                <div key={step} className="rounded-[18px] border border-black/8 bg-white p-3">
                  <div
                    className={[
                      "mb-3 h-2 rounded-full",
                      index <= activeStepIndex ? "bg-ember" : "bg-neutral-200"
                    ].join(" ")}
                  />
                  <div className="text-xs font-medium text-neutral-700">{step}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-[24px] border border-black/8 bg-white p-6 text-center text-sm leading-7 text-neutral-600">
            No shipment matches that number yet. Check the number and try again, or create a new booking in the booking tab.
          </div>
        )}
      </div>
    </motion.div>
  );

  const ShellTag = isModal ? "div" : "main";

  return (
    <ShellTag className={isModal ? "w-full bg-white" : "min-h-screen bg-white px-4 py-6 md:px-6 md:py-8"}>
      <div className={isModal ? "w-full" : "mx-auto w-full max-w-6xl"}>
        {isModal ? (
          <div
            className={[
              "flex items-center gap-4 px-5 pb-0 pt-5 md:px-8 md:pt-6",
              activeTab === "book" ? "justify-between" : "justify-end"
            ].join(" ")}
          >
            {activeTab === "book" && (
              <div className="min-w-0 flex-1">
                {renderBookingStepper(true, compactStepperRef)}
              </div>
            )}
            <div className="flex items-center gap-2">
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
          <header className="flex flex-col gap-5 rounded-[32px] bg-white px-5 py-5 shadow-[0_18px_40px_rgba(140,110,78,0.08)] md:px-8 md:py-6">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <LogoMark />
                <span className="text-sm font-medium text-neutral-700">Swift Signate</span>
              </Link>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <div className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs uppercase tracking-[0.16em] text-neutral-600">
                  Signed in as {currentUser?.name}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void signOut();
                    router.push("/");
                  }}
                  className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950"
                >
                  Sign Out
                </button>
                <Link
                  href="/"
                  className="rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-neutral-700 transition-colors hover:border-orange-300 hover:text-neutral-950"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            <div className="max-w-3xl">
              <SectionBadge label="Customer Services" />
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-5xl">
                {pageTitle}
              </h1>
              <p className="mt-4 text-base leading-7 text-neutral-600 md:text-lg">
                {pageCopy}
              </p>
            </div>
          </header>
        )}

        <section
          className={
            isModal
              ? "bg-white px-5 pb-5 pt-3 md:px-8 md:pb-8 md:pt-4"
              : "mt-6 rounded-[32px] bg-white p-5 shadow-[0_18px_40px_rgba(140,110,78,0.08)] md:p-8"
          }
        >
          {!isModal && (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {!isLockedToSingleTab && (
                <div className="inline-flex rounded-full border border-black/8 bg-white p-1 shadow-[0_8px_18px_rgba(140,110,78,0.06)]">
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
              <div className="text-sm text-neutral-500">{pageHelper}</div>
            </div>
          )}

          {notice && (
            <div className={`${isModal ? "" : "mt-5 "}rounded-[22px] border border-orange-300 bg-white px-4 py-3 text-sm leading-6 text-neutral-700`}>
              {notice}
            </div>
          )}

          {visibleCustomerUpdates.length > 0 && (
            <div className={`${notice ? "mt-4" : isModal ? "mt-4" : "mt-5"} space-y-3`}>
              {visibleCustomerUpdates.map((update) => (
                <div
                  key={update.id}
                  className="rounded-[24px] border border-orange-200 bg-white px-4 py-4 shadow-[0_10px_18px_rgba(140,110,78,0.05)] md:px-5"
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
                      className="rounded-full border border-black/8 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.16em] text-neutral-600 transition-colors hover:border-orange-300 hover:text-neutral-950"
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
                : "overflow-hidden rounded-[30px] border border-black/8 bg-white shadow-[0_12px_24px_rgba(140,110,78,0.06)]"
            ].join(" ")}
          >
            <AnimatePresence mode="wait">{activeTab === "book" ? renderBookTab() : renderTrackTab()}</AnimatePresence>
          </div>
        </section>

        {!isModal && (
          <section className="mt-6 rounded-[32px] bg-white p-5 shadow-[0_18px_40px_rgba(140,110,78,0.08)] md:p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <SectionBadge label="Recent Shipments" />
                <h2 className="mt-3 text-2xl font-semibold text-neutral-950">Latest customer bookings</h2>
              </div>
              <div className="text-sm text-neutral-500">Tap any tracking number to open it in the tracking tab</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {shipments.slice(0, 3).map((shipment) => (
                <button
                  key={shipment.ref}
                  type="button"
                  onClick={() => {
                    router.push(`/dashboard/track?ref=${encodeURIComponent(shipment.ref)}`);
                  }}
                  className="rounded-[24px] border border-black/8 bg-white p-5 text-left shadow-[0_10px_18px_rgba(140,110,78,0.05)] transition-colors hover:border-orange-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="text-sm font-semibold text-neutral-950">{shipment.ref}</div>
                    <span
                      className={[
                        "rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em]",
                        statusClasses(shipment.status)
                      ].join(" ")}
                    >
                      {shipment.status}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-neutral-700">{shipment.customer}</div>
                  <div className="mt-2 text-sm text-neutral-600">
                    {shipment.origin} {"->"} {shipment.destination}
                  </div>
                  <div className="mt-3 text-xs uppercase tracking-[0.18em] text-neutral-500">{shipment.eta}</div>
                </button>
              ))}
            </div>
          </section>
        )}

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
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ember">Payment update</div>
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
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ShellTag>
  );
}
