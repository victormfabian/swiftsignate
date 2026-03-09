import { DashboardPage } from "@/components/dashboard-page";

type DashboardTrackRouteProps = {
  searchParams: Promise<{
    ref?: string;
  }>;
};

export default async function DashboardTrackRoute({ searchParams }: DashboardTrackRouteProps) {
  const params = await searchParams;
  return <DashboardPage initialTab="track" initialTrackingRef={params.ref} />;
}
