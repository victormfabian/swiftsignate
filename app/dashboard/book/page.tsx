import { redirect } from "next/navigation";
import { DashboardPage } from "@/components/dashboard-page";
import { getAuthSession } from "@/lib/auth-session";

export default async function DashboardBookRoute() {
  const session = await getAuthSession();

  if (!session || session.role !== "user") {
    redirect("/auth?next=%2Fdashboard%2Fbook");
  }

  return <DashboardPage initialTab="book" />;
}
