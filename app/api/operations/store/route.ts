import { NextResponse } from "next/server";
import { getOperationalStore } from "@/lib/operations-db";
import { getAuthSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        message: "Unauthorized"
      },
      { status: 401 }
    );
  }

  const store =
    session.role === "admin"
      ? await getOperationalStore({ includePaymentRequests: true })
      : await getOperationalStore({
          customerEmail: session.user.email,
          includePaymentRequests: false
        });

  return NextResponse.json({
    ok: true,
    ...store
  });
}
