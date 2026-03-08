"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo-mark";

type ConsoleShellProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
  active: "dashboard" | "admin";
};

const navItems = [
  { id: "dashboard", label: "User Dashboard", href: "/dashboard/book" },
  { id: "admin", label: "Swift Admin", href: "/swiftadmin" },
  { id: "landing", label: "Landing Page", href: "/" }
] as const;

export function ConsoleShell({ title, eyebrow, children, active }: ConsoleShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[#f7f4ef] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] w-full max-w-7xl gap-5 lg:grid-cols-[auto_1fr]">
        <aside
          className={[
            "flex min-h-full flex-col rounded-[28px] border border-black/8 bg-white p-4 shadow-[0_16px_34px_rgba(140,110,78,0.06)] transition-all duration-300",
            collapsed ? "lg:w-[92px]" : "lg:w-[248px]"
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className={collapsed ? "hidden lg:block" : "block"}>
              <LogoMark />
            </div>
            {collapsed && (
              <div className="hidden lg:flex">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fcfaf7]">
                  <span className="h-2.5 w-2.5 rounded-full bg-ember" />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="rounded-full bg-[#fcfaf7] px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:text-neutral-900"
            >
              {collapsed ? "Open" : "Fold"}
            </button>
          </div>
          <div className="mt-8 flex-1 space-y-3">
            {navItems.map((item) => {
              const selected =
                (item.id === "dashboard" && active === "dashboard") || (item.id === "admin" && active === "admin");

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={[
                    "group flex items-center gap-3 rounded-2xl px-4 py-3 transition-all duration-300",
                    selected
                      ? "bg-orange-50 text-neutral-900"
                      : "bg-[#fcfaf7] text-neutral-600 hover:text-neutral-900"
                  ].join(" ")}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="rounded-[22px] bg-[#fcfaf7] p-4">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              {!collapsed && <span className="text-xs uppercase tracking-[0.18em] text-emerald-700">Live</span>}
            </div>
          </div>
        </aside>

        <section className="relative overflow-hidden rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:p-8">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex flex-col gap-4 border-b border-black/6 pb-6 md:flex-row md:items-end md:justify-between"
            >
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</div>
                <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-[2.65rem]">{title}</h1>
              </div>
              <div className="rounded-full bg-[#fcfaf7] px-4 py-2 text-xs uppercase tracking-[0.18em] text-neutral-600">
                Swift Signate
              </div>
            </motion.div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
