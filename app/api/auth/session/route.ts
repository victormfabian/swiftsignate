import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAuthSession();

  return NextResponse.json({
    ok: true,
    session
  });
}
