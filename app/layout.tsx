import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SiteContentProvider } from "@/components/site-content-store";
import { getSiteContentRecord } from "@/lib/operations-db";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Swift Signate",
  description: "Futuristic logistics command platform for bookings, tracking, and fleet operations.",
  metadataBase: new URL(siteUrl),
  icons: {
    icon: "/api/content/logo",
    shortcut: "/api/content/logo",
    apple: "/api/content/logo"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: "Swift Signate",
    description: "Futuristic logistics command platform for bookings, tracking, and fleet operations.",
    url: siteUrl,
    siteName: "Swift Signate",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Swift Signate",
    description: "Futuristic logistics command platform for bookings, tracking, and fleet operations."
  }
};

export default async function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  const initialContent = await getSiteContentRecord();

  return (
    <html lang="en">
      <body>
        <SiteContentProvider initialContent={initialContent}>{children}</SiteContentProvider>
      </body>
    </html>
  );
}
