import { NextResponse } from "next/server";
import { submitContactRequestRecord } from "@/lib/operations-db";
import type { ContactRequestInput } from "@/lib/shipment-model";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as ContactRequestInput;

  if (!body.name?.trim() || !body.email?.trim() || !body.phone?.trim() || !body.message?.trim()) {
    return NextResponse.json({ ok: false, message: "All contact fields are required." }, { status: 400 });
  }

  const contactRequest = await submitContactRequestRecord(body);

  return NextResponse.json({
    ok: true,
    contactRequest
  });
}
