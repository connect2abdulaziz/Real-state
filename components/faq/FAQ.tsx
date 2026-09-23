"use client";

import { useState } from "react";
import Image from "next/image";
import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";
import { Reveal } from "@/components/motion/Reveal";

/**
 * FAQ — accordion list + large atmospheric image (reference layout).
 */
export function FAQ() {
  const {
    index,
    eyebrow,
    title,
    subtitle,
    cta,
    ctaHref,
    footerNote,
    image,
    imageAlt,
    items,
  } = siteContent.faq;

  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section
      id="faq"
      data-section="faq"
      className="relative z-20 overflow-hidden bg-background py-16 md:py-20 lg:py-24"
      aria-labelledby="faq-title"
    >
      <div className="page-container">
        <Reveal>
          {/* Top: title + CTA */}
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-xl">
              <h2
                id="faq-title"
                className="text-[clamp(1.85rem,3.5vw,2.85rem)] font-light tracking-[-0.02em] text-foreground"
              >
                {title}
              </h2>
              <p className="mt-3 text-sm text-foreground-muted md:text-base">
                {subtitle}
              </p>
            </div>

            <FusedCtaButton
              href={ctaHref}
              label={cta}
              className="shrink-0 self-start md:self-auto"
            />
          </div>

          {/* Body: accordion | image */}
          <div className="mt-12 grid grid-cols-1 items-start gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-6">
              <ul className="divide-y divide-white/10 border-y border-white/10">
                {items.map((item, i) => {
                  const open = openIndex === i;
                  const num = String(i + 1).padStart(2, "0");

                  return (
                    <li key={item.question}>
                      <button
                        type="button"
                        onClick={() => setOpenIndex(open ? -1 : i)}
                        className="flex w-full items-start gap-4 py-5 text-left md:gap-6 md:py-6"
                        aria-expanded={open}
                      >
                        <span className="mt-0.5 shrink-0 text-sm tracking-wide text-warm/90">
                          {num}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start justify-between gap-4">
                            <span className="text-base text-foreground md:text-lg">
                              {item.question}
                            </span>
                            <span
                              className="mt-1 shrink-0 text-lg leading-none text-foreground-muted"
                              aria-hidden="true"
                            >
                              {open ? "−" : "+"}
                            </span>
                          </span>
                          <span
                            className={[
                              "grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                            ].join(" ")}
                          >
                            <span className="overflow-hidden">
                              <span className="mt-3 block text-sm leading-relaxed text-foreground-muted">
                                {item.answer}
                              </span>
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="lg:col-span-6">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[1.75rem] border border-white/10 md:aspect-[4/5] lg:min-h-[28rem] lg:aspect-auto lg:h-full lg:max-h-[36rem]">
                <Image
                  src={image}
                  alt={imageAlt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/35 via-transparent to-transparent" />
              </div>
            </div>
          </div>

          {/* Footer meta */}
          <div className="mt-12 flex items-center justify-between gap-4 border-t border-white/5 pt-6 md:mt-16">
            <p className="text-[11px] tracking-[0.18em] text-foreground-subtle uppercase">
              ({index}) {eyebrow}
            </p>
            <p className="text-[10px] tracking-[0.22em] text-foreground-subtle uppercase">
              {footerNote}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
