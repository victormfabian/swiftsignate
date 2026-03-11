import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { isCustomerEmailConfigured } from "@/lib/customer-email";
import { sendPaymentRequestQuoteRecord } from "@/lib/operations-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const paymentRequest = await sendPaymentRequestQuoteRecord(id);

  if (!paymentRequest) {
    return NextResponse.json({ ok: false, message: "Shipment request not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    paymentRequest,
    warning: isCustomerEmailConfigured()
      ? undefined
      : "Shipment quote was saved, but email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL before quote emails can be sent."
  });
}
