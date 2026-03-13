"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlowButton } from "@/components/buttons";
import { LogoMark } from "@/components/logo-mark";
import { useSiteContentStore } from "@/components/site-content-store";

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const initialFormState: ContactForm = {
  name: "",
  email: "",
  phone: "",
  message: ""
};

type NavigationProps = {
  showContactButton?: boolean;
  contactOpen?: boolean;
  onContactOpenChange?: (open: boolean) => void;
};

export function Navigation({ showContactButton = true, contactOpen, onContactOpenChange }: NavigationProps) {
  const [internalContactOpen, setInternalContactOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [form, setForm] = useState<ContactForm>(initialFormState);
  const { content } = useSiteContentStore();
  const isContactOpen = contactOpen ?? internalContactOpen;
  const setContactOpen = (open: boolean) => {
    if (contactOpen === undefined) {
      setInternalContactOpen(open);
    }

    onContactOpenChange?.(open);
  };

  useEffect(() => {
    if (!isContactOpen) {
      return;
    }

    setSubmitted(false);
    setSubmitMessage("");
  }, [isContactOpen]);

  useEffect(() => {
    if (!isContactOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContactOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isContactOpen]);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitMessage("");

    try {
      const response = await fetch("/api/contact-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const result = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        setSubmitMessage(result.message ?? "We could not save your request right now.");
        setSubmitting(false);
        return;
      }

      setSubmitted(true);
      setSubmitMessage("Request received. Our team will follow up using your contact details.");
      setForm(initialFormState);
    } catch {
      setSubmitMessage("We could not save your request right now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.header
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="sticky top-4 z-40 mx-auto w-[min(1180px,calc(100%-24px))] text-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-2 sm:gap-4">
          <Link href="/" className="shrink-0">
            <LogoMark tone="light" mediaSrc={content.navigation.logoMedia} presentation="bare" />
          </Link>

          {showContactButton ? (
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <GlowButton
                onClick={() => setContactOpen(true)}
                label={content.navigation.contactButtonLabel}
                variant="ghost"
                shape="parallelogram"
                className="min-h-[44px] border-white/16 bg-white px-5 text-neutral-950 shadow-[0_10px_24px_rgba(0,0,0,0.18)] hover:border-orange-200 hover:text-ember"
              />
            </div>
          ) : null}
        </div>
      </motion.header>

      <AnimatePresence>
        {isContactOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/60 px-4 py-6 backdrop-blur-sm"
          >
            <div
              className="flex min-h-full items-center justify-center"
              onClick={() => setContactOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 28, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 18, scale: 0.98 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                role="dialog"
                aria-modal="true"
                aria-labelledby="contact-modal-title"
                className="max-h-[calc(100vh-24px)] w-full max-w-lg overflow-y-auto rounded-[26px] bg-[#fffaf5] p-4 text-neutral-900 shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:p-5"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id="contact-modal-title" className="text-lg font-semibold tracking-[-0.03em] text-neutral-950 md:text-xl">
                      {content.navigation.contactModalTitle}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-neutral-700 transition-colors hover:bg-orange-50 hover:text-ember"
                  >
                    <span className="sr-only">Close contact form</span>
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <form
                  className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3"
                  onSubmit={handleContactSubmit}
                >
                  <label className="col-span-2 block">
                    <span className="mb-1 block text-[13px] font-medium text-neutral-700">Agent Name</span>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="name"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-neutral-700">Email Address</span>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="name@example.com"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-[13px] font-medium text-neutral-700">Phone Number</span>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      className="h-10 w-full rounded-2xl border border-black/10 bg-white px-3.5 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="+234 800 000 0000"
                    />
                  </label>

                  <label className="col-span-2 block">
                    <span className="mb-1 block text-[13px] font-medium text-neutral-700">Message</span>
                    <textarea
                      required
                      rows={3}
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      className="w-full rounded-[22px] border border-black/10 bg-white px-3.5 py-2.5 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="Tell us what you want to ship or the help you need."
                    />
                  </label>

                  <div className="col-span-2 flex flex-col gap-2 border-t border-black/8 pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-[42px] items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {submitting ? "Sending..." : content.navigation.contactModalSubmitLabel}
                    </button>

                    {submitMessage && (
                      <p className={`text-sm ${submitted ? "text-emerald-700" : "text-red-600"}`}>
                        {submitMessage}
                      </p>
                    )}
                  </div>
                </form>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
