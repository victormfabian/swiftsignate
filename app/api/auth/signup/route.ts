import { NextResponse } from "next/server";
import { createPartnerApplication } from "@/lib/auth-db";
import { isCustomerEmailConfigured } from "@/lib/customer-email";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      businessName?: string;
      email?: string;
    };

    if (!body.businessName?.trim() || !isValidEmail(body.email ?? "")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Business name and email are required."
        },
        { status: 400 }
      );
    }

    const result = await createPartnerApplication({
      businessName: body.businessName,
      email: body.email ?? ""
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json({
      ok: true,
      message: isCustomerEmailConfigured()
        ? "Partner registration received. An admin will review your request and email your temporary password after approval."
        : "Partner registration received, but email delivery is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL before approval emails can be sent.",
      partner: result.partner
    });
  } catch (error) {
    console.error("Auth signup failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Partner registration failed. Check the database connection and try again."
      },
      { status: 500 }
    );
  }
}
