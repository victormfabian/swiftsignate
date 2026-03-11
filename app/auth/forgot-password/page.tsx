import { PasswordRecoveryPanel } from "@/components/password-recovery-panel";

type ForgotPasswordRouteProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function ForgotPasswordRoute({ searchParams }: ForgotPasswordRouteProps) {
  const params = await searchParams;

  return <PasswordRecoveryPanel mode="request" nextPath={params.next || "/dashboard/book"} />;
}
