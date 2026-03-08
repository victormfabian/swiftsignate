import { NextResponse } from "next/server";
import { bookShipmentRecord } from "@/lib/operations-db";
import { getAuthSession } from "@/lib/auth-session";
import type { BookingInput } from "@/lib/shipment-model";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as BookingInput;

  if (body.customerEmail.trim().toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ ok: false, message: "Invalid customer session." }, { status: 403 });
  }

  const shipment = await bookShipmentRecord(body);

  return NextResponse.json({
    ok: true,
    shipment
  });
}
