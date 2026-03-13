"use client";

import Link from "next/link";
import { motion } from "framer-motion";

type GlowButtonProps = {
  href?: string;
  label: string;
  variant?: "primary" | "ghost";
  shape?: "pill" | "parallelogram";
  className?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  ariaControls?: string;
  ariaExpanded?: boolean;
};

export function GlowButton({
  href,
  label,
  variant = "primary",
  shape = "pill",
  className = "",
  onClick,
  type = "button",
  ariaControls,
  ariaExpanded
}: GlowButtonProps) {
  const isPrimary = variant === "primary";
  const isParallelogram = shape === "parallelogram";
  const shimmerClassName = isPrimary ? "button-shimmer button-shimmer--primary" : "button-shimmer button-shimmer--ghost";
  const classes = [
    "group relative inline-flex items-center justify-center overflow-hidden px-6 py-3 text-sm font-medium transition-all duration-300 isolate",
    isParallelogram ? "slant-button min-h-[52px] border px-8" : "rounded-full",
    isPrimary
      ? "border-white/28 bg-ember text-white shadow-[0_14px_28px_rgba(249,115,22,0.22)] hover:shadow-[0_18px_36px_rgba(249,115,22,0.28)]"
      : "border border-black/10 bg-white text-neutral-800 hover:border-ember hover:text-ember",
    className
  ].join(" ");

  return (
    <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}>
      {href ? (
        <Link href={href} className={classes}>
          <div aria-hidden="true" className={shimmerClassName} />
          {!isPrimary && (
            <span className="absolute inset-y-0 left-0 z-0 w-0 bg-orange-50 transition-all duration-300 group-hover:w-full" />
          )}
          <span className="relative z-10">{label}</span>
        </Link>
      ) : (
        <button
          type={type}
          onClick={onClick}
          aria-controls={ariaControls}
          aria-expanded={ariaExpanded}
          className={classes}
        >
          <div aria-hidden="true" className={shimmerClassName} />
          {!isPrimary && (
            <span className="absolute inset-y-0 left-0 z-0 w-0 bg-orange-50 transition-all duration-300 group-hover:w-full" />
          )}
          <span className="relative z-10">{label}</span>
        </button>
      )}
    </motion.div>
  );
}
