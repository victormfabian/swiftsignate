import { AuthPanel } from "@/components/auth-panel";

export default function SwiftAdminSignInRoute() {
  return <AuthPanel role="admin" mode="page" nextPath="/swiftadmin" />;
}
