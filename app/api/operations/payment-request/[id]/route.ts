import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { updatePaymentRequestRecord } from "@/lib/operations-db";
import type { PaymentRequest } from "@/lib/shipment-model";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const updates = (await request.json()) as Partial<PaymentRequest>;
  const paymentRequest = await updatePaymentRequestRecord(id, updates);

  if (!paymentRequest) {
    return NextResponse.json({ ok: false, message: "Payment request not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    paymentRequest
  });
}
