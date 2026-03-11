import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL("/auth", request.url);
  url.searchParams.set("error", "Google log in is unavailable for partner access. Use your business email instead.");
  return NextResponse.redirect(url);
}
