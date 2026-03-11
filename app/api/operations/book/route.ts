import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  await request.json().catch(() => null);

  return NextResponse.json(
    {
      ok: false,
      message: "Direct booking is disabled. Submit a shipment inquiry and wait for the admin quote instead."
    },
    { status: 410 }
  );
}
