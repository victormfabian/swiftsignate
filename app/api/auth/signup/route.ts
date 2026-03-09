import { NextResponse } from "next/server";
import { createUser } from "@/lib/auth-db";
import { issueUserSession, setSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
    };

    if (!body.name?.trim() || !body.phone?.trim() || !body.password?.trim() || !isValidEmail(body.email ?? "")) {
      return NextResponse.json(
        {
          ok: false,
          message: "Name, email, phone number, and password are required."
        },
        { status: 400 }
      );
    }

    if (body.password.trim().length < 6) {
      return NextResponse.json(
        {
          ok: false,
          message: "Password must be at least 6 characters."
        },
        { status: 400 }
      );
    }

    const result = await createUser({
      name: body.name,
      email: body.email ?? "",
      phone: body.phone,
      password: body.password
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 409 });
    }

    const response = NextResponse.json({
      ok: true,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone
      }
    });

    setSessionCookie(response, await issueUserSession(result.user.id));

    return response;
  } catch (error) {
    console.error("Auth signup failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: "Sign up failed. Check the database connection and try again."
      },
      { status: 500 }
    );
  }
}
