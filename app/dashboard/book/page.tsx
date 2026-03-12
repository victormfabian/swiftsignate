import { redirect } from "next/navigation";

export default async function DashboardBookRoute() {
  redirect("/dashboard/track");
}
