import type { Metadata } from "next";
import { DashboardPage } from "@/components/dashboard-page";

export const metadata: Metadata = {
  title: "Track Shipment | Swift Signate",
  description: "Track your Swift Signate shipment and check live delivery progress from a single page.",
  alternates: {
    canonical: "/dashboard/track"
  },
  openGraph: {
    title: "Track Shipment | Swift Signate",
    description: "Track your Swift Signate shipment and check live delivery progress from a single page.",
    url: "/dashboard/track"
  },
  twitter: {
    title: "Track Shipment | Swift Signate",
    description: "Track your Swift Signate shipment and check live delivery progress from a single page."
  }
};

type DashboardTrackRouteProps = {
  searchParams: Promise<{
    ref?: string;
  }>;
};

export default async function DashboardTrackRoute({ searchParams }: DashboardTrackRouteProps) {
  const params = await searchParams;
  return <DashboardPage initialTab="track" initialTrackingRef={params.ref} />;
}
