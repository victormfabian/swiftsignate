import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { completePartnerProfile } from "@/lib/auth-db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    phone?: string;
    password?: string;
    confirmPassword?: string;
  };

  if (!body.phone?.trim() || !body.password?.trim()) {
    return NextResponse.json({ ok: false, message: "Phone number and new password are required." }, { status: 400 });
  }

  if (body.password.trim().length < 6) {
    return NextResponse.json({ ok: false, message: "Use a password with at least 6 characters." }, { status: 400 });
  }

  if (body.password !== body.confirmPassword) {
    return NextResponse.json({ ok: false, message: "Password confirmation does not match." }, { status: 400 });
  }

  const partner = await completePartnerProfile(session.user.id, {
    phone: body.phone,
    password: body.password
  });

  if (!partner) {
    return NextResponse.json({ ok: false, message: "Could not complete your partner profile." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    partner
  });
}
