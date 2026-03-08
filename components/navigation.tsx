"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
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

function buildContactMessage(form: ContactForm) {
  return encodeURIComponent(
    [
      "Hello Swift Signate,",
      "",
      `Name: ${form.name || "-"}`,
      `Email: ${form.email || "-"}`,
      `Phone: ${form.phone || "-"}`,
      "",
      "Message:",
      form.message || "-"
    ].join("\n")
  );
}

export function Navigation() {
  const [contactOpen, setContactOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [form, setForm] = useState<ContactForm>(initialFormState);
  const { content } = useSiteContentStore();

  useEffect(() => {
    if (!contactOpen) {
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
  }, [contactOpen]);

  const encodedMessage = buildContactMessage(form);
  const whatsappHref = `https://wa.me/?text=${encodedMessage}`;
  const emailHref = `mailto:${content.navigation.contactEmail}?subject=Logistics%20Inquiry&body=${encodedMessage}`;

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
        <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-3 sm:gap-4">
          <Link href="/" className="shrink-0">
            <LogoMark tone="light" />
          </Link>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <label className="sr-only" htmlFor="language-selector">
              Select language
            </label>
            <div className="relative">
              <select
                id="language-selector"
                defaultValue="en"
                className="h-11 appearance-none bg-transparent px-3 pr-8 text-sm font-medium text-white outline-none"
              >
                <option value="en" className="text-neutral-900">
                  EN
                </option>
                <option value="fr" className="text-neutral-900">
                  FR
                </option>
                <option value="es" className="text-neutral-900">
                  ES
                </option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/80">
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m5.5 7.5 4.5 4.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setSubmitMessage("");
                setContactOpen(true);
              }}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-neutral-950 transition-colors hover:bg-orange-100"
                  >
              {content.navigation.contactButtonLabel}
                    </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {contactOpen && (
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
                className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-y-auto rounded-[28px] bg-[#fffaf5] p-5 text-neutral-900 shadow-[0_24px_60px_rgba(0,0,0,0.22)] md:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-medium uppercase tracking-[0.18em] text-ember">{content.navigation.contactModalEyebrow}</div>
                    <h2 id="contact-modal-title" className="mt-2 text-xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-2xl">
                      {content.navigation.contactModalTitle}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setContactOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-700 transition-colors hover:bg-orange-50 hover:text-ember"
                  >
                    <span className="sr-only">Close contact form</span>
                    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>

                <form
                  className="mt-5 space-y-3"
                  onSubmit={handleContactSubmit}
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-neutral-700">Full Name</span>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                        placeholder="Your full name"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-sm font-medium text-neutral-700">Email Address</span>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                        className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                        placeholder="name@example.com"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700">Phone Number</span>
                    <input
                      type="tel"
                      required
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                      className="h-11 w-full rounded-2xl border border-black/10 bg-white px-4 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="+234 800 000 0000"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-neutral-700">Message</span>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      className="w-full rounded-[24px] border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition-colors focus:border-orange-300"
                      placeholder="Tell us what you want to ship or the help you need."
                    />
                  </label>

                  <div className="flex flex-col gap-2 border-t border-black/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-full bg-neutral-950 px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-70"
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

                <div className="mt-5 border-t border-black/8 pt-5">
                  <div className="text-sm font-medium text-neutral-700">Prefer a direct channel?</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-medium text-white transition-opacity hover:opacity-92"
                      >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                        <path d="M19.05 4.93A9.94 9.94 0 0 0 12 2a10 10 0 0 0-8.66 15l-1.3 4.75 4.87-1.28A10 10 0 1 0 19.05 4.93ZM12 20.15a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-2.9.76.78-2.82-.2-.3A8.15 8.15 0 1 1 12 20.15Zm4.47-6.1c-.24-.12-1.4-.69-1.62-.77-.22-.08-.38-.12-.54.12-.16.24-.62.77-.77.93-.14.16-.28.18-.52.06-.24-.12-1-.36-1.9-1.15-.7-.62-1.18-1.4-1.32-1.63-.14-.24-.02-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.47-.4-.4-.54-.4h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2 0 1.18.86 2.32.98 2.48.12.16 1.7 2.6 4.12 3.64.58.25 1.03.4 1.39.5.58.18 1.1.15 1.52.09.46-.07 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.22-.16-.46-.28Z" />
                      </svg>
                      {content.navigation.whatsappLabel}
                    </a>
                    <a
                      href={emailHref}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 text-sm font-medium text-neutral-900 transition-colors hover:border-orange-300 hover:text-ember"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                        <path d="M4 7.5h16v9H4z" />
                        <path d="m5.5 9 6.5 4.8L18.5 9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {content.navigation.emailLabel}
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
