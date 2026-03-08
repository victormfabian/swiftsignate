import { NextResponse } from "next/server";
import { authenticateUser } from "@/lib/auth-db";
import { issueUserSession, setSessionCookie } from "@/lib/auth-session";

export const runtime = "nodejs";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export async function POST(request: Request) {
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

  const user = await authenticateUser({
    email: body.email ?? "",
    password: body.password
  });

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        message: "The email or password is incorrect."
      },
      { status: 401 }
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
}
