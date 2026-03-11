import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { saveCustomerRequestContactsRecord } from "@/lib/operations-db";
import type { ShipmentPartyDetails } from "@/lib/shipment-model";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CustomerDetailsPayload = {
  customerPhone?: string;
  sender?: ShipmentPartyDetails;
  receiver?: ShipmentPartyDetails;
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CustomerDetailsPayload;

  if (!body.customerPhone || !body.sender || !body.receiver) {
    return NextResponse.json({ ok: false, message: "Customer contact details are required." }, { status: 400 });
  }

  const { id } = await params;
  const paymentRequest = await saveCustomerRequestContactsRecord(id, session.user.email, {
    customerPhone: body.customerPhone,
    sender: body.sender,
    receiver: body.receiver
  });

  if (!paymentRequest) {
    return NextResponse.json({ ok: false, message: "Shipment request could not be updated." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    paymentRequest
  });
}
