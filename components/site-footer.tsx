"use client";

import { useMemo } from "react";
import { useSiteContentStore } from "@/components/site-content-store";
import { buildExternalHref, buildMailHref, buildWhatsAppHref } from "@/lib/contact-links";

export function SiteFooter() {
  const { content } = useSiteContentStore();
  const year = new Date().getFullYear();
  const socialLinks = useMemo(
    () =>
      [
        content.navigation.whatsappHref.trim()
          ? {
              label: content.navigation.whatsappLabel || "WhatsApp",
              href: buildWhatsAppHref(content.navigation.whatsappHref)
            }
          : null,
        content.navigation.contactEmail.trim()
          ? {
              label: content.navigation.emailLabel || "Email",
              href: buildMailHref(content.navigation.contactEmail, "Logistics Inquiry")
            }
          : null,
        content.footer.facebookHref.trim()
          ? {
              label: "Facebook",
              href: buildExternalHref(content.footer.facebookHref)
            }
          : null,
        content.footer.instagramHref.trim()
          ? {
              label: "Instagram",
              href: buildExternalHref(content.footer.instagramHref)
            }
          : null,
        content.footer.tiktokHref.trim()
          ? {
              label: "TikTok",
              href: buildExternalHref(content.footer.tiktokHref)
            }
          : null,
        content.footer.xHref.trim()
          ? {
              label: "X",
              href: buildExternalHref(content.footer.xHref)
            }
          : null
      ].filter((item): item is { label: string; href: string } => Boolean(item?.href && item.href !== "#")),
    [
      content.footer.facebookHref,
      content.footer.instagramHref,
      content.footer.tiktokHref,
      content.footer.xHref,
      content.navigation.contactEmail,
      content.navigation.emailLabel,
      content.navigation.whatsappHref,
      content.navigation.whatsappLabel
    ]
  );

  return (
    <footer className="border-t border-white/8 bg-[#171412] text-[#f7f1e9]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-white/45">Social links</div>
            <div className="mt-3 flex flex-wrap gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                  rel={link.href.startsWith("mailto:") ? undefined : "noreferrer"}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/12 bg-white/6 px-5 text-sm font-medium text-white transition-colors hover:border-orange-300 hover:text-orange-200"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="text-sm text-white/65">&copy; {year} Swift Signate</div>
        </div>

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
