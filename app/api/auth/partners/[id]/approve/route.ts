import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { approvePartnerAccount } from "@/lib/auth-db";
import { isCustomerEmailConfigured } from "@/lib/customer-email";

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
  const result = await approvePartnerAccount(id);

  if (!result) {
    return NextResponse.json({ ok: false, message: "Partner account not found." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    partner: result.partner,
    warning: isCustomerEmailConfigured()
      ? undefined
      : "Partner was approved, but email delivery is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL before approval emails can be sent."
  });
}
