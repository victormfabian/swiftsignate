"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/logo-mark";
import { PasswordField } from "@/components/password-field";
import { useSiteContentStore } from "@/components/site-content-store";

const inputClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300";
const labelClassName = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-neutral-500";

type PasswordRecoveryPanelProps =
  | {
      mode: "request";
      nextPath?: string;
    }
  | {
      mode: "reset";
      token?: string;
      nextPath?: string;
    };

export function PasswordRecoveryPanel(props: PasswordRecoveryPanelProps) {
  const router = useRouter();
  const { content } = useSiteContentStore();
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    password: "",
    confirmPassword: ""
  });

  const nextPath = props.nextPath && props.nextPath.startsWith("/") && !props.nextPath.startsWith("//") ? props.nextPath : "/dashboard/book";

  const handleForgotPassword = () => {
    void (async () => {
      setSubmitting(true);
      setNotice("");
      setDebugResetUrl("");

      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ email })
        });
        const result = (await response.json()) as { ok?: boolean; message?: string; debugResetUrl?: string };

        setNotice(result.message ?? "We could not process the reset request.");
        setDebugResetUrl(result.debugResetUrl ?? "");
      } catch {
        setNotice("We could not process the reset request.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleResetPassword = () => {
    if (!("token" in props) || !props.token?.trim()) {
      setNotice("This reset link is missing the required token.");
      return;
    }

    if (passwordForm.password.trim().length < 6) {
      setNotice("Use a password with at least 6 characters.");
      return;
    }

    if (passwordForm.password !== passwordForm.confirmPassword) {
      setNotice("Password confirmation does not match.");
      return;
    }

    void (async () => {
      setSubmitting(true);
      setNotice("");

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            token: props.token,
            password: passwordForm.password
          })
        });
        const result = (await response.json()) as { ok?: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Password reset failed.");
          return;
        }

        router.push(nextPath);
        router.refresh();
      } catch {
        setNotice("Password reset failed.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <main className="min-h-screen bg-[#faf8f5] px-4 py-6 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-[560px]">
        <div className="rounded-[28px] bg-white p-5 shadow-[0_20px_46px_rgba(140,110,78,0.08)] md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoMark mediaSrc={content.navigation.logoMedia} />
              <div>
                <div className="text-sm font-semibold text-neutral-950">Swift Signate</div>
                <div className="text-xs text-neutral-500">Account recovery</div>
              </div>
            </div>
            <Link
              href={`/auth?next=${encodeURIComponent(nextPath)}`}
              className="rounded-full px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
            >
              Back to sign in
            </Link>
          </div>

          <div className="mt-6 rounded-[24px] bg-[#fcfaf7] p-5">
            {props.mode === "request" ? (
              <div className="grid gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-[2rem]">Forgot password</h1>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Enter your account email and we will send a reset link if the account exists.
                  </p>
                </div>
                <label>
                  <span className={labelClassName}>Email</span>
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className={inputClassName}
                  />
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={submitting}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
                >
                  {submitting ? "Sending reset link..." : "Send reset link"}
                </button>
                {debugResetUrl && (
                  <a
                    href={debugResetUrl}
                    className="text-sm font-medium text-ember underline decoration-orange-200 underline-offset-4"
                  >
                    Open debug reset link
                  </a>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-[2rem]">Reset password</h1>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Choose a new password for your Swift Signate account.
                  </p>
                </div>
                <PasswordField
                  label="New password"
                  value={passwordForm.password}
                  onChange={(value) => setPasswordForm((current) => ({ ...current, password: value }))}
                  placeholder="New password"
                  autoComplete="new-password"
                  className={inputClassName}
                  labelClassName={labelClassName}
                />
                <PasswordField
                  label="Confirm password"
                  value={passwordForm.confirmPassword}
                  onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className={inputClassName}
                  labelClassName={labelClassName}
                />
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={submitting}
                  className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
                >
                  {submitting ? "Resetting password..." : "Reset password"}
                </button>
              </div>
            )}

            {notice && (
              <div className="mt-5 rounded-[18px] bg-orange-50 px-4 py-3 text-sm leading-6 text-neutral-700">
                {notice}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
