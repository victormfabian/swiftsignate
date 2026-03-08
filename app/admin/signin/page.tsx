import { AuthPanel } from "@/components/auth-panel";

export default function AdminSignInRoute() {
  return <AuthPanel role="admin" mode="page" nextPath="/admin" />;
}
