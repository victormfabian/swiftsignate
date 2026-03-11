import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { submitPaymentProofForRequestRecord } from "@/lib/operations-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    paymentProofName?: string;
    paymentProofType?: string;
    paymentProofDataUrl?: string;
  };

  if (!body.paymentProofName || !body.paymentProofType || !body.paymentProofDataUrl) {
    return NextResponse.json({ ok: false, message: "Payment proof file is required." }, { status: 400 });
  }

  const { id } = await params;
  const paymentRequest = await submitPaymentProofForRequestRecord(id, session.user.email, {
    paymentProofName: body.paymentProofName,
    paymentProofType: body.paymentProofType,
    paymentProofDataUrl: body.paymentProofDataUrl
  });

  if (!paymentRequest) {
    return NextResponse.json(
      {
        ok: false,
        message: "Shipment request is not ready for payment proof yet. Save the sender and receiver contact details first and wait for the admin quote."
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    paymentRequest
  });
}
