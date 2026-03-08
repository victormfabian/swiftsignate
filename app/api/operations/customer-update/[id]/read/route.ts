import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { markCustomerUpdateReadRecord } from "@/lib/operations-db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const success = await markCustomerUpdateReadRecord(id, session.user.email);

  if (!success) {
    return NextResponse.json({ ok: false, message: "Update not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true
  });
}
