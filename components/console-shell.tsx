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
  { id: "admin", label: "Admin Portal", href: "/admin" },
  { id: "landing", label: "Landing Page", href: "/" }
] as const;

export function ConsoleShell({ title, eyebrow, children, active }: ConsoleShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-transparent px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-32px)] w-full max-w-7xl gap-5 lg:grid-cols-[auto_1fr]">
        <aside
          className={[
            "glass-panel flex min-h-full flex-col rounded-[30px] p-4 transition-all duration-300",
            collapsed ? "lg:w-[96px]" : "lg:w-[280px]"
          ].join(" ")}
        >
          <div className="flex items-center justify-between gap-4">
            <div className={collapsed ? "hidden lg:block" : "block"}>
              <LogoMark />
            </div>
            {collapsed && (
              <div className="hidden lg:flex">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-black/8 bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-ember shadow-[0_0_16px_rgba(249,115,22,0.35)]" />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((current) => !current)}
              className="rounded-full border border-black/8 bg-white px-3 py-2 text-xs uppercase tracking-[0.18em] text-neutral-600 transition-colors hover:border-orange-300 hover:text-neutral-900"
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
                    "group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-300",
                    selected
                      ? "border-orange-200 bg-orange-50 text-neutral-900"
                      : "border-black/6 bg-white/60 text-neutral-600 hover:border-black/10 hover:text-neutral-900"
                  ].join(" ")}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="rounded-[24px] border border-black/6 bg-white/70 p-4">
            {!collapsed && (
              <>
                <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">System posture</div>
                <div className="mt-3 text-sm leading-6 text-neutral-600">
                  Unified booking, tracking, and response tools presented in a much cleaner working layout.
                </div>
              </>
            )}
            <div className="mt-4 flex items-center gap-3">
              <span className="pulse-point h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(16,185,129,0.25)]" />
              {!collapsed && <span className="text-xs uppercase tracking-[0.18em] text-emerald-700">Nominal</span>}
            </div>
          </div>
        </aside>

        <section className="glass-panel noise relative overflow-hidden rounded-[30px] p-5 md:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.08),transparent_22%)]" />
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex flex-col gap-4 border-b border-black/6 pb-6 md:flex-row md:items-end md:justify-between"
            >
              <div className="max-w-2xl">
                <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</div>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-5xl">{title}</h1>
              </div>
              <div className="rounded-full border border-black/8 bg-white/75 px-4 py-2 text-xs uppercase tracking-[0.18em] text-neutral-600">
                Swift Signate workspace
              </div>
            </motion.div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
