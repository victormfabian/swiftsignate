import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth-db";
import { issueUserSession, setSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    if (!isValidEmail(body.email ?? "") || !body.password?.trim()) {
      return NextResponse.json(
        {
          ok: false,
          message: "Email and password are required."
        },
        { status: 400 }
      );
    }

    const result = await authenticateUser({
      email: body.email ?? "",
      password: body.password
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          message:
            result.reason === "pending"
              ? "Your partner account is still waiting for admin approval."
              : "The email or password is incorrect."
        },
        { status: result.reason === "pending" ? 403 : 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        status: result.user.status,
        mustChangePassword: Boolean(result.user.must_change_password)
      }
    });

    setSessionCookie(response, await issueUserSession(result.user.id));

    return response;
  } catch (error) {
    console.error("Auth signin failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Sign in failed. Check the database connection and try again."
      },
      { status: 500 }
    );
  }
}
