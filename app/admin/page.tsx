import { redirect } from "next/navigation";
import { AdminPage } from "@/components/admin-page";
import { getAuthSession } from "@/lib/auth-session";

export default async function AdminRoute() {
  const session = await getAuthSession();

  if (!session || session.role !== "admin") {
    redirect("/admin/signin");
  }

  return <AdminPage />;
}
