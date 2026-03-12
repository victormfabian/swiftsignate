import { PasswordRecoveryPanel } from "@/components/password-recovery-panel";

type ResetPasswordRouteProps = {
  searchParams: Promise<{
    token?: string;
    next?: string;
  }>;
};

export default async function ResetPasswordRoute({ searchParams }: ResetPasswordRouteProps) {
  const params = await searchParams;

  return <PasswordRecoveryPanel mode="reset" token={params.token} nextPath={params.next || "/dashboard/track"} />;
}
