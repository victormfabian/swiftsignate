import { NextResponse } from "next/server";
import { resetUserPasswordWithToken } from "@/lib/auth-db";
import { issueUserSession, setSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      token?: string;
      password?: string;
    };

    if (!body.token?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password reset token is missing."
        },
        { status: 400 }
      );
    }

    if (!body.password?.trim() || body.password.trim().length < 6) {
      return NextResponse.json(
        {
          ok: false,
          message: "Use a password with at least 6 characters."
        },
        { status: 400 }
      );
    }

    const user = await resetUserPasswordWithToken(body.token, body.password);

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          message: "This reset link is invalid or has expired."
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone
      }
    });

    setSessionCookie(response, await issueUserSession(user.id));

    return response;
  } catch (error) {
    console.error("Password reset failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Password reset failed. Please try again."
      },
      { status: 500 }
    );
  }
}
