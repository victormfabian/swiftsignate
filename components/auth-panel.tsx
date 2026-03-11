"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PasswordField } from "@/components/password-field";

type AuthPanelProps = {
  role: "user" | "admin";
  mode?: "page" | "modal";
  title?: string;
  nextPath?: string;
  initialNotice?: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

const inputClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300";
const labelClassName = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-neutral-500";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function AuthPanel({ role, mode = "page", title, nextPath, initialNotice = "", onSuccess, onClose }: AuthPanelProps) {
  const router = useRouter();
  const [userMode, setUserMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState(initialNotice);
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: ""
  });
  const [signUpForm, setSignUpForm] = useState({
    businessName: "",
    email: "",
  });
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: ""
  });

  const heading = useMemo(() => {
    if (title) {
      return title;
    }

    if (role === "admin") {
      return "Sign in";
    }

    return userMode === "signup" ? "Partner sign up" : "Partner sign in";
  }, [role, title, userMode]);

  const safeNextPath = useMemo(() => {
    if (!nextPath) {
      return "/dashboard/book";
    }

    return nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard/book";
  }, [nextPath]);

  const handleUserSignIn = () => {
    void (async () => {
      if (!isValidEmail(signInForm.email) || !signInForm.password.trim()) {
        setNotice("Enter your email address and password to sign in.");
        return;
      }

      setSubmitting(true);

      try {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(signInForm)
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Could not sign in.");
          return;
        }

        setNotice("");
        if (onSuccess) {
          onSuccess();
          router.refresh();
          return;
        }

        router.push(safeNextPath);
        router.refresh();
      } catch {
        setNotice("Sign in failed. Check the deployment and database connection, then try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleUserSignUp = () => {
    void (async () => {
      if (!signUpForm.businessName.trim() || !isValidEmail(signUpForm.email)) {
        setNotice("Business name and email are required to request partner access.");
        return;
      }

      setSubmitting(true);

      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            businessName: signUpForm.businessName,
            email: signUpForm.email
          })
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Could not request partner access.");
          return;
        }

        setUserMode("signin");
        setSignUpForm({
          businessName: "",
          email: ""
        });
        setNotice(result.message ?? "Partner registration received. Watch your email for approval.");
      } catch {
        setNotice("Partner registration failed. Check the deployment and database connection, then try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleAdminSignIn = () => {
    void (async () => {
      if (!isValidEmail(adminForm.email) || !adminForm.password.trim()) {
        setNotice("Enter the admin email and password to continue.");
        return;
      }

      setSubmitting(true);

      try {
        const response = await fetch("/api/auth/admin/signin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(adminForm)
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Could not sign in.");
          return;
        }

        setNotice("");
        if (onSuccess) {
          onSuccess();
          router.refresh();
          return;
        }

        router.push(nextPath ?? "/swiftadmin");
        router.refresh();
      } catch {
        setNotice("Admin sign in failed. Check the deployment and database connection, then try again.");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <div className={mode === "modal" ? "bg-white p-4 md:p-6" : "min-h-screen bg-[#faf8f5] px-4 py-6 md:px-6 md:py-10"}>
      <div className={mode === "modal" ? "mx-auto w-full max-w-[520px]" : "mx-auto w-full max-w-[560px]"}>
        <div className="rounded-[28px] bg-white p-5 shadow-[0_20px_46px_rgba(140,110,78,0.08)] md:p-7">
          <div className="flex items-center justify-end gap-4">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-3 py-2 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-100"
              >
                Close
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="max-w-md">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-[2rem]">{heading}</h1>
            </div>

            <div className="mt-6 rounded-[24px] bg-[#fcfaf7] p-5">
              {role === "user" ? (
                <>
                  <div className="inline-flex rounded-full bg-white p-1 shadow-[0_6px_14px_rgba(140,110,78,0.06)]">
                    {[
                      { id: "signin", label: "Sign In" },
                      { id: "signup", label: "Sign Up" }
                    ].map((tab) => {
                      const active = userMode === tab.id;

                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setUserMode(tab.id as "signin" | "signup");
                            setNotice("");
                          }}
                          className={[
                            "rounded-full px-5 py-3 text-sm font-medium transition-all",
                            active ? "bg-orange-50 text-ember" : "text-neutral-500"
                          ].join(" ")}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {userMode === "signin" ? (
                    <div className="mt-6 grid gap-4">
                      <label>
                        <span className={labelClassName}>Email</span>
                        <input
                          value={signInForm.email}
                          onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email address"
                          autoComplete="email"
                          className={inputClassName}
                        />
                      </label>
                      <PasswordField
                        label="Password"
                        value={signInForm.password}
                        onChange={(value) => setSignInForm((current) => ({ ...current, password: value }))}
                        placeholder="Password"
                        autoComplete="current-password"
                        className={inputClassName}
                        labelClassName={labelClassName}
                      />
                      <div className="-mt-1 flex items-center justify-end gap-3 text-sm">
                        <Link
                          href={`/auth/forgot-password?next=${encodeURIComponent(safeNextPath)}`}
                          className="font-medium text-neutral-500 transition-colors hover:text-neutral-950"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <button
                        type="button"
                        onClick={handleUserSignIn}
                        disabled={submitting}
                        className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
                      >
                        {submitting ? "Signing In..." : "Sign In"}
                      </button>
                    </div>
                  ) : (
	                    <div className="mt-6 grid gap-4">
	                      <label>
	                        <span className={labelClassName}>Business name</span>
	                        <input
	                          value={signUpForm.businessName}
	                          onChange={(event) => setSignUpForm((current) => ({ ...current, businessName: event.target.value }))}
	                          placeholder="Business name"
	                          className={inputClassName}
	                        />
	                      </label>
                      <label>
                        <span className={labelClassName}>Email</span>
                        <input
                          value={signUpForm.email}
                          onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email address"
                          autoComplete="email"
                          className={inputClassName}
                        />
                      </label>
	                      <button
	                        type="button"
	                        onClick={handleUserSignUp}
	                        disabled={submitting}
	                        className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
	                      >
	                        {submitting ? "Sending Request..." : "Request Partner Access"}
	                      </button>
	                    </div>
                  )}
                </>
              ) : (
                <div className="grid gap-4">
                  <label>
                    <span className={labelClassName}>Admin email</span>
                    <input
                      value={adminForm.email}
                      onChange={(event) => setAdminForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Admin email"
                      className={inputClassName}
                    />
                  </label>
                  <PasswordField
                    label="Password"
                    value={adminForm.password}
                    onChange={(value) => setAdminForm((current) => ({ ...current, password: value }))}
                    placeholder="Admin password"
                    autoComplete="current-password"
                    className={inputClassName}
                    labelClassName={labelClassName}
                  />
                  <button
                    type="button"
                    onClick={handleAdminSignIn}
                    disabled={submitting}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
                  >
                    {submitting ? "Signing In..." : "Secure Sign In"}
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
      </div>
    </div>
  );
}
