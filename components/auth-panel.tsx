"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoMark } from "@/components/logo-mark";

type AuthPanelProps = {
  role: "user" | "admin";
  mode?: "page" | "modal";
  title?: string;
  copy?: string;
  nextPath?: string;
  onSuccess?: () => void;
  onClose?: () => void;
};

const inputClassName =
  "h-12 w-full rounded-[16px] border border-black/8 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300";
const labelClassName = "mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-neutral-500";

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value.trim());
}

export function AuthPanel({ role, mode = "page", title, copy, nextPath, onSuccess, onClose }: AuthPanelProps) {
  const router = useRouter();
  const [userMode, setUserMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: ""
  });
  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  const [adminForm, setAdminForm] = useState({
    email: "",
    password: ""
  });

  const heading = useMemo(() => {
    if (title) {
      return title;
    }

    return role === "admin" ? "Admin sign in" : "Sign in to continue";
  }, [role, title]);

  const description = useMemo(() => {
    if (copy) {
      return copy;
    }

    return role === "admin"
      ? "Only authorized Swift Signate administrators can access the operations portal."
      : "Create an account or sign in to book shipments, track updates, and access your dashboard.";
  }, [copy, role]);

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

        router.push(nextPath ?? "/dashboard/book");
        router.refresh();
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleUserSignUp = () => {
    void (async () => {
      if (!signUpForm.name.trim() || !signUpForm.phone.trim() || !isValidEmail(signUpForm.email)) {
        setNotice("Name, email, and phone number are required to create an account.");
        return;
      }

      if (signUpForm.password.trim().length < 6) {
        setNotice("Use a password with at least 6 characters.");
        return;
      }

      if (signUpForm.password !== signUpForm.confirmPassword) {
        setNotice("Password confirmation does not match.");
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
            name: signUpForm.name,
            email: signUpForm.email,
            phone: signUpForm.phone,
            password: signUpForm.password
          })
        });
        const result = (await response.json()) as { ok: boolean; message?: string };

        if (!response.ok || !result.ok) {
          setNotice(result.message ?? "Could not create the account.");
          return;
        }

        setNotice("");
        if (onSuccess) {
          onSuccess();
          router.refresh();
          return;
        }

        router.push(nextPath ?? "/dashboard/book");
        router.refresh();
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
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <div className={mode === "modal" ? "bg-white p-4 md:p-6" : "min-h-screen bg-[#faf8f5] px-4 py-6 md:px-6 md:py-10"}>
      <div className={mode === "modal" ? "mx-auto w-full max-w-[520px]" : "mx-auto w-full max-w-[560px]"}>
        <div className="rounded-[28px] bg-white p-5 shadow-[0_20px_46px_rgba(140,110,78,0.08)] md:p-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <LogoMark />
              <div>
                <div className="text-sm font-semibold text-neutral-950">Swift Signate</div>
                <div className="text-xs text-neutral-500">{role === "admin" ? "Secure admin access" : "Account access"}</div>
              </div>
            </div>
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
              <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
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
                          className={inputClassName}
                        />
                      </label>
                      <label>
                        <span className={labelClassName}>Password</span>
                        <input
                          type="password"
                          value={signInForm.password}
                          onChange={(event) =>
                            setSignInForm((current) => ({ ...current, password: event.target.value }))
                          }
                          placeholder="Password"
                          className={inputClassName}
                        />
                      </label>
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
                        <span className={labelClassName}>Full name</span>
                        <input
                          value={signUpForm.name}
                          onChange={(event) => setSignUpForm((current) => ({ ...current, name: event.target.value }))}
                          placeholder="Full name"
                          className={inputClassName}
                        />
                      </label>
                      <label>
                        <span className={labelClassName}>Email</span>
                        <input
                          value={signUpForm.email}
                          onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                          placeholder="Email address"
                          className={inputClassName}
                        />
                      </label>
                      <label>
                        <span className={labelClassName}>Phone number</span>
                        <input
                          value={signUpForm.phone}
                          onChange={(event) => setSignUpForm((current) => ({ ...current, phone: event.target.value }))}
                          placeholder="Phone number"
                          className={inputClassName}
                        />
                      </label>
                      <label>
                        <span className={labelClassName}>Password</span>
                        <input
                          type="password"
                          value={signUpForm.password}
                          onChange={(event) =>
                            setSignUpForm((current) => ({ ...current, password: event.target.value }))
                          }
                          placeholder="Create password"
                          className={inputClassName}
                        />
                      </label>
                      <label>
                        <span className={labelClassName}>Confirm password</span>
                        <input
                          type="password"
                          value={signUpForm.confirmPassword}
                          onChange={(event) =>
                            setSignUpForm((current) => ({ ...current, confirmPassword: event.target.value }))
                          }
                          placeholder="Confirm password"
                          className={inputClassName}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleUserSignUp}
                        disabled={submitting}
                        className="inline-flex min-h-[52px] items-center justify-center rounded-[14px] bg-ember px-6 text-sm font-semibold text-white"
                      >
                        {submitting ? "Creating Account..." : "Create Account"}
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
                  <label>
                    <span className={labelClassName}>Password</span>
                    <input
                      type="password"
                      value={adminForm.password}
                      onChange={(event) => setAdminForm((current) => ({ ...current, password: event.target.value }))}
                      placeholder="Admin password"
                      className={inputClassName}
                    />
                  </label>
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
