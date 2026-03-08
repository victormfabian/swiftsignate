import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { approvePaymentRequestRecord } from "@/lib/operations-db";

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
  const shipment = await approvePaymentRequestRecord(id);

  if (!shipment) {
    return NextResponse.json({ ok: false, message: "Payment request could not be approved." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    shipment
  });
}
