"use client";

import { useSiteContentStore } from "@/components/site-content-store";

export function SiteFooter() {
  useSiteContentStore();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/8 bg-[#171412] text-[#f7f1e9]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <div className="text-sm text-white/65">&copy; {year} Swift Signate</div>

        <div className="flex flex-col gap-2 border-t border-white/8 pt-4 text-sm text-white/65 sm:flex-row sm:items-center sm:justify-between">
          <div>All rights reserved.</div>
          <a
            href="https://vakes.world"
            target="_blank"
            rel="noreferrer"
            className="w-fit text-white transition-colors hover:text-orange-200"
          >
            Dev by Vakes
          </a>
        </div>
      </div>
    </footer>
  );
}
