import { redirect } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { getAuthSession } from "@/lib/auth-session";

type DashboardTrackRouteProps = {
  searchParams: Promise<{
    ref?: string;
  }>;
};

export default async function DashboardTrackRoute({ searchParams }: DashboardTrackRouteProps) {
  const params = await searchParams;
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    redirect(`/auth?next=${encodeURIComponent(params.ref ? `/dashboard/track?ref=${params.ref}` : "/dashboard/track")}`);
  }

  return <DashboardPage initialTab="track" initialTrackingRef={params.ref} />;
}
