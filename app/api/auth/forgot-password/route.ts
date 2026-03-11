import { NextResponse } from "next/server";
import { createPasswordResetToken } from "@/lib/auth-db";
import { sendCustomerEmail } from "@/lib/customer-email";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
    };

    if (!isValidEmail(body.email ?? "")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Enter a valid email address."
        },
        { status: 400 }
      );
    }

    const result = await createPasswordResetToken(body.email ?? "");

    if (!result) {
      return NextResponse.json({
        ok: true,
        message: "If an account exists for that email, a reset link has been sent."
      });
    }

    const resetUrl = new URL(`/auth/reset-password?token=${encodeURIComponent(result.token)}`, request.url).toString();
    const emailResult = await sendCustomerEmail({
      to: result.user.email,
      subject: "Swift Signate password reset",
      text: [
        "Hello,",
        "",
        "We received a request to reset your Swift Signate password.",
        `Reset your password: ${resetUrl}`,
        "",
        "This link expires in 30 minutes.",
        "",
        "Swift Signate"
      ].join("\n")
    });

    if (emailResult.skipped) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password reset email is not configured yet. Add RESEND_API_KEY and RESEND_FROM_EMAIL.",
          debugResetUrl: process.env.NODE_ENV !== "production" ? resetUrl : undefined
        },
        { status: 503 }
      );
    }

    if (!emailResult.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: "We could not send the reset email right now. Please try again."
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent."
    });
  } catch (error) {
    console.error("Forgot password failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Password reset request failed. Please try again."
      },
      { status: 500 }
    );
  }
}
