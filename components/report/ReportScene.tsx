"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerGsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/utils";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";
import type { SiteContent } from "@/data/content";

gsap.registerPlugin(useGSAP);

type ReportSceneProps = {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  sample: SiteContent["report"]["sample"];
  floaters: SiteContent["report"]["floaters"];
  cta: string;
  ctaHref: string;
  strengthsLabel: string;
};

const glassChip = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(114,215,255,0.06) 50%, rgba(255,255,255,0.03) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.25), 0 8px 28px rgba(0,0,0,0.35)",
} as const;

const glassReport = {
  background:
    "linear-gradient(160deg, rgba(13,17,21,0.92) 0%, rgba(20,26,32,0.88) 45%, rgba(7,9,11,0.94) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 0 0 1px rgba(114,215,255,0.08), 0 24px 80px rgba(0,0,0,0.55)",
} as const;

/**
 * ReportScene — cinematic stage entrance (ported from estate-valora landing).
 */
export function ReportScene({
  index,
  eyebrow,
  title,
  description,
  sample,
  floaters,
  cta,
  ctaHref,
  strengthsLabel,
}: ReportSceneProps) {
  const sectionRef = useRef<HTMLElement>(null);
  registerGsap();

  useGSAP(
    () => {
      const root = sectionRef.current;
      if (!root) return;

      const reduced = prefersReducedMotion();

      if (reduced) {
        gsap.set('[data-report="mask"]', {
          clipPath: "circle(75% at 50% 50%)",
        });
        gsap.set('[data-report="card"]', { opacity: 1, y: 0 });
        gsap.set('[data-report="chips"] > *', { opacity: 1 });
        gsap.set('[data-report="copy"]', { opacity: 1, y: 0 });
        gsap.set('[data-report="cta"]', { opacity: 1 });
        return;
      }

      gsap.set('[data-report="mask"]', {
        clipPath: "circle(0% at 50% 50%)",
      });
      gsap.set('[data-report="card"]', { opacity: 0, y: 80 });
      gsap.set('[data-report="chips"] > *', { opacity: 0 });
      gsap.set('[data-report="copy"]', { opacity: 0, y: 20 });
      gsap.set('[data-report="cta"]', { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(
        '[data-report="mask"]',
        {
          clipPath: "circle(75% at 50% 50%)",
          ease: "power2.out",
          duration: 3,
        },
        0,
      );

      tl.to(
        '[data-report="card"]',
        {
          opacity: 1,
          y: 0,
          ease: "power3.out",
          duration: 3.5,
        },
        2.5,
      );

      tl.to(
        '[data-report="chips"] > *',
        {
          opacity: 1,
          ease: "power2.out",
          duration: 2.5,
          stagger: 0.35,
        },
        3.5,
      );

      tl.to(
        '[data-report="copy"]',
        {
          opacity: 1,
          y: 0,
          ease: "power3.out",
          duration: 2.5,
        },
        6,
      );

      tl.to(
        '[data-report="cta"]',
        {
          opacity: 1,
          ease: "power2.out",
          duration: 2,
        },
        6.5,
      );

      requestAnimationFrame(() => ScrollTrigger.refresh());
    },
    { scope: sectionRef, dependencies: [] },
  );

  return (
    <section
      ref={sectionRef}
      id="report"
      data-section="report"
      className="relative z-20 h-svh overflow-hidden"
      aria-labelledby="report-title"
    >
      <div className="relative h-full w-full overflow-hidden">
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 45%, #1c1814 0%, #141210 45%, #0f0e0c 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 50% 45% at 55% 50%, rgba(215,168,102,0.22) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 30% 40%, rgba(44,156,197,0.12) 0%, transparent 60%)",
          }}
        />

        <div
          data-report="mask"
          className="report-mask absolute inset-0 bg-[#07090b]"
          aria-hidden="true"
          style={{
            boxShadow:
              "inset 0 0 0 1px rgba(215,168,102,0.18), 0 0 60px 0 rgba(183,172,127,0.08)",
          }}
        />

        <div className="page-container relative z-10 flex h-full flex-col justify-center gap-5 py-5 md:block md:gap-0 md:py-0">
          <div
            data-report="copy"
            className="relative z-20 w-full shrink-0 md:absolute md:top-[14%] md:left-[4%] md:max-w-[18rem] lg:left-[6%] lg:max-w-[20rem]"
          >
            <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] text-foreground-subtle uppercase">
              <span className="text-electric">{index}</span>
              <span
                className="h-px w-8 bg-electric-soft/50"
                aria-hidden="true"
              />
              <span>{eyebrow}</span>
            </p>

            <h2
              id="report-title"
              className="mt-3 text-[clamp(1.35rem,5vw,2.4rem)] font-light leading-[1.15] tracking-[-0.02em] text-foreground md:mt-4"
            >
              {title}
            </h2>

            <p className="mt-3 hidden max-w-xs text-sm leading-[1.7] text-foreground-muted md:block">
              {description}
            </p>
          </div>

          <div className="relative z-10 w-full shrink-0 md:absolute md:inset-0 md:flex md:items-center md:justify-center">
            <div
              data-report="card"
              className="relative w-full md:max-w-[20.5rem]"
            >
              <div
                data-report="chips"
                aria-hidden="true"
                className="pointer-events-none"
              >
                {floaters.map((chip, i) => {
                  const pos =
                    [
                      "left-0 top-[4%] scale-90 md:-left-12 lg:-left-16",
                      "right-0 top-[8%] scale-90 md:-right-12 lg:-right-16",
                      "left-0 bottom-[14%] scale-90 md:-left-10 lg:-left-14",
                      "right-0 bottom-[8%] scale-90 md:-right-12 lg:-right-16",
                    ][i] ?? "left-0 top-[4%]";
                  return (
                    <div
                      key={chip.label}
                      className={`absolute z-20 hidden md:block ${pos}`}
                    >
                      <div
                        className="rounded-2xl border border-white/20 px-3 py-2 backdrop-blur-xl"
                        style={glassChip}
                      >
                        <p className="text-[8px] tracking-[0.2em] text-electric/80 uppercase">
                          {chip.label}
                        </p>
                        <p className="mt-0.5 text-base font-light tracking-tight text-foreground">
                          {chip.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div
                className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[22rem] w-[22rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl md:block"
                style={{
                  background:
                    "radial-gradient(circle, rgba(232,196,120,0.4) 0%, rgba(215,168,102,0.16) 40%, transparent 70%)",
                }}
                aria-hidden="true"
              />

              <article
                className="relative z-10 w-full rounded-2xl border border-white/15 px-5 py-5 backdrop-blur-xl md:px-6 md:py-7"
                style={glassReport}
                aria-label="Sample valuation report preview"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3 md:pb-3.5">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-electric/85 uppercase">
                      {sample.brand}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {sample.docLabel}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border border-warm/35 bg-warm/10 md:h-9 md:w-9">
                    <span className="text-[10px] tracking-wider text-warm">
                      EV
                    </span>
                  </div>
                </div>

                <div className="mt-3 md:mt-4">
                  <p className="text-sm text-foreground-muted">
                    {sample.propertyType}
                  </p>
                  <p className="mt-0.5 text-base text-foreground md:mt-1 md:text-lg">
                    {sample.property}
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 md:mt-5">
                  <p className="text-[10px] tracking-[0.18em] text-foreground-subtle uppercase">
                    {sample.rangeLabel}
                  </p>
                  <p
                    className="mt-1.5 font-light tracking-tight text-foreground"
                    style={{ fontSize: "clamp(1.45rem, 2.8vw, 1.9rem)" }}
                  >
                    <span className="text-warm">{sample.rangeLow}</span>
                    <span className="mx-2 text-foreground-subtle">–</span>
                    <span>{sample.rangeHigh}</span>
                  </p>
                  <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full w-[62%] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(215,168,102,0.85) 0%, rgba(114,215,255,0.7) 100%)",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 md:mt-5">
                  <p className="text-[10px] tracking-[0.18em] text-electric-soft uppercase">
                    {strengthsLabel}
                  </p>
                  <ul className="mt-2.5 space-y-1.5">
                    {sample.strengths.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2.5 text-sm text-foreground-muted"
                      >
                        <span
                          className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-electric"
                          aria-hidden="true"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="mt-5 hidden border-t border-white/10 pt-3.5 text-xs leading-relaxed text-foreground-subtle md:block">
                  {sample.limitation}
                </p>
              </article>
            </div>
          </div>

          <div
            data-report="cta"
            className="relative z-20 w-full shrink-0 md:absolute md:right-[4%] md:bottom-[12%] md:w-auto lg:right-[6%]"
          >
            <FusedCtaButton href={ctaHref} label={cta} />
          </div>
        </div>
      </div>
    </section>
  );
}
