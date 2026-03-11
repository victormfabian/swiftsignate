export type ShipmentStatus = "Booked" | "Picked up" | "In transit" | "Out for delivery" | "Delivered";
export type ShipmentPaymentMethod = "Direct transfer" | "Paystack";
export type PaymentRequestStatus = "Inquiry received" | "Quote sent" | "Payment submitted" | "Awaiting verification" | "Approved" | "Rejected";
export type ShipperType = "private" | "business";
export type WeightUnit = "kg" | "lb";
export type DimensionUnit = "cm" | "in";
export type QuoteSort = "fastest" | "lowest" | "premium";
export type PartnerStatus = "pending" | "approved";

export type ShipmentPackage = {
  id: string;
  weight: string;
  length: string;
  width: string;
  height: string;
};

export type ShipmentPartyDetails = {
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

export type ShipmentQuote = {
  id: string;
  title: string;
  etaHeadline: string;
  etaDetail: string;
  pickupNote: string;
  operator: string;
  price: number;
  ratePerKg?: number;
  minimumTotal?: number;
  serviceFee?: number;
  packagingFee?: number;
  liabilityFee?: number;
  residentialFee?: number;
  extraPackageFee?: number;
};

export type BookingRecordDetails = {
  shipperType: ShipperType | "";
  route: {
    fromCountry: string;
    fromCity: string;
    toCountry: string;
    toCity: string;
    shipmentDate: string;
    residential: boolean | null;
  };
  shipment: {
    packagingType: string;
    higherLiability: boolean | null;
    weightUnit: WeightUnit;
    dimensionUnit: DimensionUnit;
    packages: ShipmentPackage[];
  };
  sender: ShipmentPartyDetails;
  receiver: ShipmentPartyDetails;
  quoteSort: QuoteSort;
  selectedQuote: ShipmentQuote | null;
  payment: {
    method: ShipmentPaymentMethod;
    note?: string;
  };
};

export type ContactRequest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type ContactRequestInput = Pick<ContactRequest, "name" | "email" | "phone" | "message">;

export type Shipment = {
  ref: string;
  airWaybill: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  origin: string;
  destination: string;
  eta: string;
  status: ShipmentStatus;
  packageType: string;
  paymentMethod: ShipmentPaymentMethod;
  clearanceFee?: number;
  lastUpdate: string;
  createdAt: string;
  details?: BookingRecordDetails | null;
};

export type PaymentRequest = {
  id: string;
  customer: string;
  customerEmail: string;
  customerPhone: string;
  origin: string;
  destination: string;
  eta: string;
  packageType: string;
  paymentMethod: "Direct transfer";
  serviceTitle: string;
  amount: number;
  status: PaymentRequestStatus;
  createdAt: string;
  note: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  quoteSentAt?: string;
  invoiceNumber?: string;
  invoiceIssuedAt?: string;
  paymentProofName: string;
  paymentProofType: string;
  paymentProofDataUrl: string;
  shipmentRef?: string;
  airWaybill?: string;
  details?: BookingRecordDetails | null;
};

export type CustomerUpdate = {
  id: string;
  customerEmail: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

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

export type ShipmentStoreState = {
  shipments: Shipment[];
  paymentRequests: PaymentRequest[];
  customerUpdates: CustomerUpdate[];
  contactRequests: ContactRequest[];
  partnerAccounts: PartnerAccount[];
  nextSequence: number;
};

export type BookingInput = {
  customer: string;
  customerEmail: string;
  customerPhone: string;
  origin: string;
  destination: string;
  eta: string;
  packageType: string;
  paymentMethod: ShipmentPaymentMethod;
  details?: BookingRecordDetails | null;
};

export type TransferRequestInput = BookingInput & {
  serviceTitle: string;
  amount: number;
  note?: string;
  paymentProofName?: string;
  paymentProofType?: string;
  paymentProofDataUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  quoteSentAt?: string;
};

export const STATUS_FLOW: ShipmentStatus[] = ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"];

export const seedShipments: Shipment[] = [
  {
    ref: "SS100003",
    airWaybill: "AWB-2026-100003",
    customer: "Northline Foods",
    customerEmail: "ops@northlinefoods.com",
    customerPhone: "+2348000003003",
    origin: "Port Harcourt",
    destination: "Dakar",
    eta: "Delivered at 8:40 AM",
    status: "Delivered",
    packageType: "Cold-chain goods",
    paymentMethod: "Direct transfer",
    lastUpdate: "Delivery completed and received by customer.",
    createdAt: "Mar 7, 2026"
  },
  {
    ref: "SS100002",
    airWaybill: "AWB-2026-100002",
    customer: "Prime Mart",
    customerEmail: "shipping@primemart.co",
    customerPhone: "+2348000002002",
    origin: "Abuja",
    destination: "Accra",
    eta: "Tomorrow, 9:30 AM",
    status: "Booked",
    packageType: "Retail stock",
    paymentMethod: "Paystack",
    lastUpdate: "Booking confirmed and waiting for pickup scheduling.",
    createdAt: "Mar 7, 2026"
  },
  {
    ref: "SS100001",
    airWaybill: "AWB-2026-100001",
    customer: "BlueWave Retail",
    customerEmail: "dispatch@bluewaveretail.com",
    customerPhone: "+2348000001001",
    origin: "Lagos",
    destination: "Nairobi",
    eta: "Today, 4:20 PM",
    status: "In transit",
    packageType: "Consumer goods",
    paymentMethod: "Direct transfer",
    lastUpdate: "Shipment departed regional hub at 10:15 AM.",
    createdAt: "Mar 6, 2026"
  }
];

export function normalizeTrackingNumber(value: string) {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (!normalized) {
    return "";
  }

  if (normalized.startsWith("SS")) {
    return normalized;
  }

  const digits = normalized.replace(/[^0-9]/g, "");
  return digits ? `SS${digits}` : normalized;
}

export function parseTrackingSequence(reference: string) {
  const normalized = normalizeTrackingNumber(reference);
  const match = normalized.match(/(\d{6})$/);
  return Number(match?.[1] ?? "100000");
}

export function formatTrackingNumber(sequence: number) {
  return `SS${sequence.toString().padStart(6, "0")}`;
}

export function formatAirWaybill(sequence: number) {
  return `AWB-2026-${sequence.toString().padStart(6, "0")}`;
}

export function formatPaymentRequestId(sequence: number) {
  return `PAY-2026-${sequence.toString().padStart(6, "0")}`;
}

export function formatInvoiceNumber(sequence: number) {
  return `INV-2026-${sequence.toString().padStart(6, "0")}`;
}

export function formatCreatedAt() {
  return new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatDeliveredAt() {
  return `Delivered at ${new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  })}`;
}

export function buildLastUpdate(status: ShipmentStatus, shipment: Pick<Shipment, "origin" | "destination">) {
  switch (status) {
    case "Booked":
      return `Booking confirmed for ${shipment.origin} to ${shipment.destination}.`;
    case "Picked up":
      return `Shipment has been picked up from ${shipment.origin}.`;
    case "In transit":
      return `Shipment is currently in transit to ${shipment.destination}.`;
    case "Out for delivery":
      return `Shipment is out for delivery in ${shipment.destination}.`;
    case "Delivered":
      return "Delivery completed and received by customer.";
    default:
      return "Shipment update received.";
  }
}

export function getShipmentSteps() {
  return STATUS_FLOW;
}

export function previewTrackingNumber(nextSequence: number) {
  return formatTrackingNumber(nextSequence);
}

export function previewAirWaybill(nextSequence: number) {
  return formatAirWaybill(nextSequence);
}
