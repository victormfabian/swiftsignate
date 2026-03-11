"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LogoMark } from "@/components/logo-mark";

type ConsoleShellProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
  active: "dashboard" | "admin";
  logoMedia?: string;
};

export function ConsoleShell({ title, eyebrow, children, logoMedia, active }: ConsoleShellProps) {
  const isAdminShell = active === "admin";

  if (isAdminShell) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#e9eef3]">
        <div className="relative min-h-screen px-4 py-4 sm:px-5 md:px-6">{children}</div>
      </main>
    );
  }

  return (
    <main
      className={[
        "min-h-screen overflow-x-hidden px-3 py-3 sm:px-4 md:px-6 md:py-6",
        "bg-[#f7f4ef]"
      ].join(" ")}
    >
      <div className="mx-auto w-full max-w-7xl">
        <section
          className="relative overflow-hidden rounded-[30px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(252,250,247,0.96))] p-4 shadow-[0_16px_34px_rgba(140,110,78,0.06)] sm:p-5 md:p-8"
        >
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={[
                "mb-6 flex flex-col gap-4 border-b pb-5 md:mb-8 md:flex-row md:items-end md:justify-between md:pb-6",
                isAdminShell ? "border-black/8" : "border-black/6"
              ].join(" ")}
            >
              <div className="flex items-start gap-4">
                <Link href="/" className="shrink-0">
                  <LogoMark mediaSrc={logoMedia} />
                </Link>
                <div className="max-w-2xl">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</div>
                  <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-neutral-950 sm:text-3xl md:text-[2.65rem]">{title}</h1>
                </div>
              </div>
              <Link
                href="/"
                className={[
                  "inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-medium transition-colors sm:w-auto",
                  isAdminShell
                    ? "border border-black/8 bg-white text-neutral-700 hover:border-black/15 hover:text-neutral-950"
                    : "bg-[#fcfaf7] text-neutral-700 hover:text-neutral-950"
                ].join(" ")}
              >
                Back to site
              </Link>
            </motion.div>
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
