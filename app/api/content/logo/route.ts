import { NextResponse } from "next/server";
import { getSiteContentRecord } from "@/lib/operations-db";
import { resolveMediaSource } from "@/lib/media-utils";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redirectToFallbackLogo() {
  return NextResponse.redirect(new URL("/icon.png", getSiteUrl()));
}

function decodeDataUrl(source: string) {
  const match = source.match(/^data:([^;,]+)?(?:;charset=[^;,]+)?(;base64)?,([\s\S]*)$/);

  if (!match) {
    return null;
  }

  const mimeType = match[1] || "application/octet-stream";
  const isBase64 = Boolean(match[2]);
  const payload = match[3] || "";

  return {
    mimeType,
    buffer: isBase64 ? Buffer.from(payload, "base64") : Buffer.from(decodeURIComponent(payload), "utf8")
  };
}

export async function GET() {
  const content = await getSiteContentRecord();
  const media = resolveMediaSource(content.navigation.logoMedia);

  if (media.kind !== "image" || !media.src) {
    return redirectToFallbackLogo();
  }

  if (media.src.startsWith("data:")) {
    const decoded = decodeDataUrl(media.src);

    if (!decoded) {
      return redirectToFallbackLogo();
    }

    return new NextResponse(decoded.buffer, {
      headers: {
        "Content-Type": decoded.mimeType,
        "Cache-Control": "no-store, max-age=0"
      }
    });
  }

  if (media.src.startsWith("/")) {
    return NextResponse.redirect(new URL(media.src, getSiteUrl()));
  }

  try {
    const response = await fetch(media.src, { cache: "no-store" });

    if (!response.ok) {
      return redirectToFallbackLogo();
    }

    return new NextResponse(response.body, {
      headers: {
        "Content-Type": response.headers.get("content-type") || "image/png",
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch {
    return redirectToFallbackLogo();
  }
}
