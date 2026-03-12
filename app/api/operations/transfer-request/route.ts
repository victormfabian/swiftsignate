import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  await request.json().catch(() => null);

  return NextResponse.json({
    ok: false,
    message: "Customer-side booking is disabled. Create shipments from the admin side only."
  }, { status: 410 });
}
