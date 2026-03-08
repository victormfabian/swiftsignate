import { NextResponse } from "next/server";
import { authenticateAdmin } from "@/lib/auth-db";
import { issueAdminSession, setSessionCookie } from "@/lib/auth-session";

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

    const admin = await authenticateAdmin({
      email: body.email ?? "",
      password: body.password
    });

    if (!admin) {
      return NextResponse.json(
        {
          ok: false,
          message: "Admin credentials are incorrect."
        },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });

    setSessionCookie(response, await issueAdminSession(admin.id));

    return response;
  } catch {
    return NextResponse.json(
      {
        ok: false,
        message: "Admin authentication failed. Check the database connection and try again."
      },
      { status: 500 }
    );
  }
}
