import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { bookShipmentRecord } from "@/lib/operations-db";
import type { BookingInput } from "@/lib/shipment-model";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const input = (await request.json().catch(() => null)) as BookingInput | null;

  if (!input) {
    return NextResponse.json({ ok: false, message: "Invalid shipment payload." }, { status: 400 });
  }

  const hasRequiredFields = [
    input.customer,
    input.customerEmail,
    input.customerPhone,
    input.origin,
    input.destination,
    input.eta,
    input.packageType
  ].every((value) => typeof value === "string" && value.trim());

  if (!hasRequiredFields) {
    return NextResponse.json({ ok: false, message: "Complete the shipment details before creating it." }, { status: 400 });
  }

  if (!["Direct transfer", "Paystack"].includes(input.paymentMethod)) {
    return NextResponse.json({ ok: false, message: "Invalid payment method." }, { status: 400 });
  }

  const shipment = await bookShipmentRecord(input);

  return NextResponse.json({
    ok: true,
    shipment
  });
}
