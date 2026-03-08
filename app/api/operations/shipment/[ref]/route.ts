import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { updateShipmentRecordByRef } from "@/lib/operations-db";
import type { Shipment } from "@/lib/shipment-model";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    ref: string;
  }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { ref } = await params;
  const updates = (await request.json()) as Partial<Shipment>;
  const shipment = await updateShipmentRecordByRef(ref, updates);

  if (!shipment) {
    return NextResponse.json({ ok: false, message: "Shipment not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    shipment
  });
}
