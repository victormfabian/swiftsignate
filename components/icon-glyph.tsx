"use client";

import { resolveMediaSource } from "@/lib/media-utils";

type IconGlyphProps = {
  icon: string;
  className?: string;
  fallbackClassName?: string;
};

export function IconGlyph({
  icon,
  className = "h-10 w-10",
  fallbackClassName = "flex h-12 w-12 items-center justify-center rounded-2xl border border-black/10 bg-white text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-600"
}: IconGlyphProps) {
  const media = resolveMediaSource(icon);

  switch (icon) {
    case "clipboard":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 4.5h6" strokeLinecap="round" />
          <path d="M8.5 3.5h7a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2Z" />
          <path d="M8 9.5h8M8 13h8M8 16.5h5" strokeLinecap="round" />
        </svg>
      );
    case "tracking":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.5-3.5M11 8v3.2l2.4 1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "support":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M6.5 14.5v-2.3a5.5 5.5 0 1 1 11 0v2.3" strokeLinecap="round" />
          <rect x="4.5" y="13" width="3.5" height="5.5" rx="1.2" />
          <rect x="16" y="13" width="3.5" height="5.5" rx="1.2" />
          <path d="M18 19c0 1.1-.9 2-2 2h-1.5" strokeLinecap="round" />
        </svg>
      );
    case "quote":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M5 7.5h14M5 12h10M5 16.5h7" strokeLinecap="round" />
          <path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z" />
        </svg>
      );
    case "route":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6.5" cy="17.5" r="2" />
          <circle cx="17.5" cy="6.5" r="2" />
          <path d="M8.5 16.4c2.5-1.4 3.8-2.7 5.1-5.2M11.2 16.7h6.3v-6.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "delivery":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 7.5h11v8h-11z" />
          <path d="M14.5 10h3.2l2 2.4V15h-5.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7.5" cy="17" r="1.8" />
          <circle cx="17.5" cy="17" r="1.8" />
        </svg>
      );
    case "freight":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M2.5 7.5h12v7h-12z" />
          <path d="M14.5 10h3l2 2.2V14h-5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="16.8" r="1.8" />
          <circle cx="17.2" cy="16.8" r="1.8" />
          <path d="M5.5 10.2h4.5" strokeLinecap="round" />
        </svg>
      );
    case "express":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3.5 12h8.5" strokeLinecap="round" />
          <path d="M2.5 15.5h6.5" strokeLinecap="round" />
          <path d="M10.5 6.5h4.2L20 12l-5.3 5.5h-4.2l3.3-5.5-3.3-5.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "warehouse":
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="m4 10 8-5 8 5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M5.5 9.5v9h13v-9" />
          <path d="M9 13h6M9 16h6" strokeLinecap="round" />
        </svg>
      );
    default:
      if (media.kind === "image") {
        return <img src={media.src} alt="" className={`${className} object-contain`} />;
      }

      if (media.kind === "video") {
        return <video src={media.src} className={`${className} rounded-xl object-cover`} autoPlay muted loop playsInline />;
      }

      return <div className={fallbackClassName}>{media.label}</div>;
  }
}
