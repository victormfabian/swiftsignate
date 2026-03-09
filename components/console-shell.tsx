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

export function ConsoleShell({ title, eyebrow, children, logoMedia }: ConsoleShellProps) {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f4ef] px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto w-full max-w-7xl">
        <section className="relative overflow-hidden rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_16px_34px_rgba(140,110,78,0.06)] md:p-8">
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 flex flex-col gap-4 border-b border-black/6 pb-6 md:flex-row md:items-end md:justify-between"
            >
              <div className="flex items-start gap-4">
                <Link href="/" className="shrink-0">
                  <LogoMark mediaSrc={logoMedia} />
                </Link>
                <div className="max-w-2xl">
                  <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">{eyebrow}</div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-neutral-950 md:text-[2.65rem]">{title}</h1>
                </div>
              </div>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#fcfaf7] px-5 text-sm font-medium text-neutral-700 transition-colors hover:text-neutral-950"
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
