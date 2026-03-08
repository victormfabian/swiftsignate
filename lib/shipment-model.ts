export type ShipmentStatus = "Booked" | "Picked up" | "In transit" | "Out for delivery" | "Delivered";
export type ShipmentPaymentMethod = "Direct transfer" | "Paystack";
export type PaymentRequestStatus = "Awaiting verification" | "Approved" | "Rejected";

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
  lastUpdate: string;
  createdAt: string;
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
  paymentProofName: string;
  paymentProofType: string;
  paymentProofDataUrl: string;
  shipmentRef?: string;
  airWaybill?: string;
};

export type CustomerUpdate = {
  id: string;
  customerEmail: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
};

export type ShipmentStoreState = {
  shipments: Shipment[];
  paymentRequests: PaymentRequest[];
  customerUpdates: CustomerUpdate[];
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
};

export type TransferRequestInput = BookingInput & {
  serviceTitle: string;
  amount: number;
  note?: string;
  paymentProofName: string;
  paymentProofType: string;
  paymentProofDataUrl: string;
};

export const STATUS_FLOW: ShipmentStatus[] = ["Booked", "Picked up", "In transit", "Out for delivery", "Delivered"];

export const seedShipments: Shipment[] = [
  {
    ref: "SS-2026-100003",
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
    ref: "SS-2026-100002",
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
    ref: "SS-2026-100001",
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

export function formatTrackingNumber(sequence: number) {
  return `SS-2026-${sequence.toString().padStart(6, "0")}`;
}

export function formatAirWaybill(sequence: number) {
  return `AWB-2026-${sequence.toString().padStart(6, "0")}`;
}

export function formatPaymentRequestId(sequence: number) {
  return `PAY-2026-${sequence.toString().padStart(6, "0")}`;
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
