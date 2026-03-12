import { AuthPanel } from "@/components/auth-panel";

type AuthRouteProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function AuthRoute({ searchParams }: AuthRouteProps) {
  const params = await searchParams;

  return <AuthPanel role="user" mode="page" nextPath={params.next || "/dashboard/track"} initialNotice={params.error || ""} />;
}
