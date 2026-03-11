"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlowButton } from "@/components/buttons";
import { DashboardPage } from "@/components/dashboard-page";
import { IconGlyph } from "@/components/icon-glyph";
import { Navigation } from "@/components/navigation";
import { SiteFooter } from "@/components/site-footer";
import { useSiteContentStore } from "@/components/site-content-store";
import { mediaSourceToBackground, resolveMediaSource } from "@/lib/media-utils";

function CardIcon({ icon }: { icon: string }) {
  return <IconGlyph icon={icon} className="h-10 w-10" />;
}

function MediaTile({
  source,
  title,
  className
}: {
  source?: string;
  title: string;
  className: string;
}) {
  const media = resolveMediaSource(source);
  const backgroundImage = mediaSourceToBackground(source);

  if (media.kind === "video") {
    return (
      <div className={`${className} overflow-hidden bg-neutral-900`}>
        <video src={media.src} className="h-full w-full object-cover" autoPlay muted loop playsInline />
      </div>
    );
  }

  if (media.kind === "audio") {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-4 bg-[#f7f1e9] px-5 py-6 text-center`}>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{media.label}</div>
        <audio controls className="w-full max-w-[280px]">
          <source src={media.src} />
        </audio>
      </div>
    );
  }

  if (media.kind === "pdf") {
    return (
      <div className={`${className} overflow-hidden bg-white`}>
        <iframe src={media.src} title={title} className="h-full w-full" />
      </div>
    );
  }

  if (media.kind === "file") {
    return (
      <div className={`${className} flex flex-col items-center justify-center gap-4 bg-[#f7f1e9] px-5 py-6 text-center`}>
        <div className="flex h-16 w-16 items-center justify-center rounded-[22px] border border-black/10 bg-white text-xs font-semibold uppercase tracking-[0.18em] text-neutral-700">
          {media.label}
        </div>
        <a
          href={media.src}
          target="_blank"
          rel="noreferrer"
          className="text-sm font-medium text-ember underline decoration-orange-200 underline-offset-4"
        >
          Open file
        </a>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={backgroundImage ? { backgroundImage, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    />
  );
}

function HeroBackground({ source }: { source: string }) {
  const media = resolveMediaSource(source);
  const backgroundImage = mediaSourceToBackground(source);

  if (media.kind === "video") {
    return (
      <video
        src={media.src}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />
    );
  }

  return (
    <div
      className="absolute inset-0"
      style={backgroundImage ? { backgroundImage, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
    />
  );
}

function ServiceCard({
  card,
  index,
  stacked = false
}: {
  card: { title: string; copy: string; image?: string };
  index: number;
  stacked?: boolean;
}) {
  return (
    <article
      className={[
        "overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_18px_40px_rgba(140,110,78,0.08)]",
        stacked ? "sticky text-center lg:text-left" : "flex h-full flex-col text-center md:text-left"
      ].join(" ")}
      style={stacked ? { top: `calc(clamp(82px, 9vw, 112px) + ${index * 22}px)` } : undefined}
    >
      <div className={stacked ? "grid items-stretch lg:grid-cols-[0.48fr_0.52fr]" : ""}>
        <MediaTile
          source={card.image}
          title={card.title}
          className={stacked ? "h-56 w-full md:h-[320px]" : "h-48 w-full"}
        />

        <div className={["flex flex-1 flex-col", stacked ? "p-7 lg:p-10" : "p-6 md:p-8"].join(" ")}>
          <h3 className={["font-semibold text-neutral-950", stacked ? "text-2xl md:text-3xl" : "text-2xl"].join(" ")}>
            {card.title}
          </h3>
          <p className={["flex-1 text-neutral-600", stacked ? "mt-4 max-w-2xl text-lg leading-8" : "mt-4 text-base leading-7"].join(" ")}>
            {card.copy}
          </p>
        </div>
      </div>
    </article>
  );
}

function TrustCard({
  point,
  index,
  direction = "none",
  mobileOnly = false
}: {
  point: { title: string; copy: string; icon: string };
  index: number;
  direction?: "left" | "right" | "none";
  mobileOnly?: boolean;
}) {
  const initialState =
    direction === "left"
      ? { opacity: 0, x: -120, rotate: -4, scale: 0.96 }
      : direction === "right"
        ? { opacity: 0, x: 120, rotate: 4, scale: 0.96 }
        : { opacity: 0, y: 18 };

  return (
    <div
      className={[
        mobileOnly ? "flex justify-center will-change-transform" : "w-full"
      ].join(" ")}
    >
      <motion.div
        initial={initialState}
        whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.7, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={[
          "flex h-full flex-col rounded-[24px] border border-black/8 bg-white p-5 text-center shadow-[0_14px_30px_rgba(140,110,78,0.06)] lg:text-left",
          mobileOnly ? "w-[92%] max-w-[380px]" : ""
        ].join(" ")}
      >
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-orange-50 text-ember lg:mx-0">
          <CardIcon icon={point.icon} />
        </div>
        <h3 className="text-lg font-semibold text-neutral-950">{point.title}</h3>
        <p className="mt-2 flex-1 text-base leading-7 text-neutral-600">{point.copy}</p>
      </motion.div>
    </div>
  );
}

export function LandingPage() {
  const [activeHeroPanel, setActiveHeroPanel] = useState<"track" | null>(null);
  const [showDiscoverCue, setShowDiscoverCue] = useState(true);
  const heroPanelRef = useRef<HTMLElement | null>(null);
  const servicesSectionRef = useRef<HTMLElement | null>(null);
  const shouldRevealHeroPanelRef = useRef(false);
  const { content } = useSiteContentStore();

  useEffect(() => {
    const handleScroll = () => {
      setShowDiscoverCue(window.scrollY < 28 && !activeHeroPanel);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeHeroPanel]);

  useEffect(() => {
    if (!activeHeroPanel || !heroPanelRef.current || !shouldRevealHeroPanelRef.current) {
      return;
    }

    let firstFrame = 0;
    let secondFrame = 0;

    firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        heroPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        shouldRevealHeroPanelRef.current = false;
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [activeHeroPanel]);

  const scrollToServices = () => {
    servicesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleTrackPanelOpen = () => {
    shouldRevealHeroPanelRef.current = true;
    setActiveHeroPanel("track");
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f7f1e9] text-neutral-900">
      <section className="relative min-h-[100svh] overflow-hidden">
        <HeroBackground source={content.hero.backgroundImage} />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.38)_34%,rgba(0,0,0,0.62)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.08),transparent_22%)]" />
        <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4 md:px-6">
          <Navigation />
        </div>
        <div className="relative flex min-h-[100svh] items-center px-4 pb-28 pt-28 md:px-6 md:pb-32 md:pt-32">
          <div className="mx-auto w-full max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-3xl text-center sm:text-left"
            >
              <div className="text-sm font-medium uppercase tracking-[0.22em] text-white">{content.hero.eyebrow}</div>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-5xl lg:text-7xl">
                {content.hero.title}
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-white sm:text-lg sm:leading-8 md:text-xl">
                {content.hero.copy}
              </p>
              <div className="mx-auto mt-10 grid max-w-[280px] grid-cols-1 gap-3 sm:mx-0 sm:max-w-[360px] sm:grid-cols-2">
                <GlowButton
                  onClick={handleTrackPanelOpen}
                  label={content.hero.trackButtonLabel}
                  shape="parallelogram"
                  className="w-full justify-center px-5"
                  ariaControls="hero-service-modal"
                  ariaExpanded={activeHeroPanel === "track"}
                />
                <Link
                  href="/dashboard/book"
                  className="slant-button inline-flex min-h-[52px] w-full items-center justify-center border border-white/24 bg-black/24 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/32"
                >
                  <strong>{content.hero.bookButtonLabel}</strong>
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
        <AnimatePresence>
          {showDiscoverCue && (
            <motion.button
              type="button"
              onClick={scrollToServices}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.28 }}
              className="discover-signal absolute inset-x-0 bottom-5 z-20 flex justify-center text-white md:bottom-6"
            >
              <span className="discover-signal__glow flex flex-col items-center justify-center text-white/92">
                <span className="discover-signal__arrows flex flex-col items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 md:h-6 md:w-6" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="m7 9 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </section>

      <AnimatePresence initial={false}>
        {activeHeroPanel && (
          <motion.section
            key="hero-service-modal"
            id="hero-service-modal"
            ref={heroPanelRef}
            initial={{ opacity: 0, y: 76, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformOrigin: "50% 0%" }}
            className="relative z-20 -mt-28 scroll-mt-4 px-4 pb-8 md:-mt-32 md:px-6 md:pb-10"
          >
            <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[32px] bg-white shadow-[0_32px_80px_rgba(23,20,18,0.18)]">
              <DashboardPage
                initialTab={activeHeroPanel}
                displayMode="modal"
                lockedTab={activeHeroPanel}
                onClose={() => setActiveHeroPanel(null)}
              />
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section id="services" ref={servicesSectionRef} className="px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="max-w-2xl text-center md:text-left">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-ember">{content.services.eyebrow}</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-5xl">
              {content.services.title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">{content.services.copy}</p>
          </div>

          <div className="relative mt-12 flex flex-col gap-6 md:hidden">
            {content.services.cards.map((card, index) => (
              <ServiceCard key={card.title} card={card} index={index} stacked />
            ))}
          </div>

          <div className="mt-12 hidden gap-6 md:grid md:auto-rows-fr md:grid-cols-3">
            {content.services.cards.map((card, index) => (
              <ServiceCard key={card.title} card={card} index={index} />
            ))}
          </div>
        </div>
      </section>

      <section id="why-us" className="bg-[#fffaf4] px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div className="overflow-hidden rounded-[32px] border border-black/8 bg-white shadow-[0_18px_40px_rgba(140,110,78,0.08)]">
            <MediaTile source={content.whyUs.image} title={content.whyUs.title} className="h-[320px] w-full md:h-[420px]" />
          </div>

          <div className="text-center lg:text-left">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-ember">{content.whyUs.eyebrow}</div>
            <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-5xl">
              {content.whyUs.title}
            </h2>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-neutral-600">{content.whyUs.copy}</p>

            <div className="mt-8 flex flex-col gap-4 md:hidden">
              {content.whyUs.points.map((point, index) => (
                <TrustCard
                  key={point.title}
                  point={point}
                  index={index}
                  direction={index === 1 ? "left" : "right"}
                  mobileOnly
                />
              ))}
            </div>

            <div className="mt-8 hidden gap-4 md:grid md:auto-rows-fr">
              {content.whyUs.points.map((point, index) => (
                <div
                  key={point.title}
                  className="flex h-full flex-col rounded-[24px] border border-black/8 bg-white p-5 text-center shadow-[0_14px_30px_rgba(140,110,78,0.06)] lg:text-left"
                >
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-[28px] bg-orange-50 text-ember lg:mx-0">
                    <CardIcon icon={point.icon} />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-950">{point.title}</h3>
                  <p className="mt-2 flex-1 text-base leading-7 text-neutral-600">{point.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="tracking" className="bg-[#171412] px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto w-full max-w-6xl rounded-[36px] bg-white px-6 py-12 text-neutral-900 shadow-[0_18px_40px_rgba(140,110,78,0.08)] md:px-10 md:py-14">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="text-center lg:text-left">
              <div className="text-sm font-medium uppercase tracking-[0.18em] text-ember">{content.process.eyebrow}</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-5xl">
                {content.process.title}
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-8 text-neutral-600">{content.process.copy}</p>
            </div>

            <div className="grid gap-4 md:auto-rows-fr">
              {content.process.steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.45, delay: index * 0.08 }}
                  className="flex h-full flex-col rounded-[24px] border border-black/8 bg-[#fffaf5] p-5"
                >
                  <div className="text-sm font-medium text-ember">Step 0{index + 1}</div>
                  <h3 className="mt-2 text-xl font-semibold text-neutral-950">{step.title}</h3>
                  <p className="mt-2 flex-1 text-base leading-7 text-neutral-600">{step.copy}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-white px-4 py-16 md:px-6 md:py-20">
        <div className="mx-auto grid w-full max-w-6xl gap-8 rounded-[32px] border border-black/8 bg-[#fffaf5] p-8 shadow-[0_18px_40px_rgba(140,110,78,0.08)] md:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="text-sm font-medium uppercase tracking-[0.18em] text-ember">{content.contactCta.eyebrow}</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 md:text-5xl">
              {content.contactCta.title}
            </h2>
            <p className="mt-5 text-lg leading-8 text-neutral-600">{content.contactCta.copy}</p>
          </div>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:flex-col lg:justify-start">
            <GlowButton
              href="/dashboard/book"
              label={content.contactCta.primaryLabel}
              shape="parallelogram"
              className="w-full sm:min-w-[220px]"
            />
            <Link
              href="/dashboard/track"
              className="slant-button inline-flex min-h-[52px] items-center justify-center border border-black/10 bg-white px-8 py-3 text-sm font-medium text-neutral-900 transition-colors hover:border-orange-300 hover:text-ember sm:min-w-[220px]"
            >
              <strong>{content.contactCta.secondaryLabel}</strong>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
