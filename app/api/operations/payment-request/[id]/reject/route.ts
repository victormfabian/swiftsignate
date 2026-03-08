import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { rejectPaymentRequestRecord } from "@/lib/operations-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const success = await rejectPaymentRequestRecord(id, body.reason);

  if (!success) {
    return NextResponse.json({ ok: false, message: "Payment request could not be rejected." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true
  });
}
