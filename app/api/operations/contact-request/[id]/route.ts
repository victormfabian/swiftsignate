import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { updateContactRequestRecord } from "@/lib/operations-db";
import type { ContactRequest } from "@/lib/shipment-model";

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
  const updates = (await request.json()) as Partial<ContactRequest>;
  const contactRequest = await updateContactRequestRecord(id, updates);

  if (!contactRequest) {
    return NextResponse.json({ ok: false, message: "Contact request not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    contactRequest
  });
}
