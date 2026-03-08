import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-session";
import { getSiteContentRecord, resetSiteContentRecord, updateSiteContentRecord } from "@/lib/operations-db";
import type { SiteContent } from "@/lib/site-content-model";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    content: await getSiteContentRecord()
  });
}

export async function PUT(request: Request) {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const content = (await request.json()) as SiteContent;

  return NextResponse.json({
    ok: true,
    content: await updateSiteContentRecord(content)
  });
}

export async function DELETE() {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    content: await resetSiteContentRecord()
  });
}
