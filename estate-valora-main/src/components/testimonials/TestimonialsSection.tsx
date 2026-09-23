"use client";

import Image from "next/image";
import { siteContent } from "@/data/content";
import { Reveal } from "@/components/motion/Reveal";

type Testimonial = (typeof siteContent.testimonials.items)[number];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="text-[11px] text-warm">
          ★
        </span>
      ))}
    </div>
  );
}

function TestimonialCard({ item }: { item: Testimonial }) {
  return (
    <article
      className="w-full rounded-2xl border border-white/12 p-5"
      style={{
        background:
          "linear-gradient(160deg, rgba(20,18,14,0.95) 0%, rgba(12,10,8,0.92) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 32px rgba(0,0,0,0.35)",
      }}
    >
      <Stars count={item.rating} />
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        “{item.quote}”
      </p>
      <p className="mt-4 text-sm">
        <span className="font-medium text-foreground">{item.name}</span>
        <span className="text-foreground-muted"> — {item.role}</span>
      </p>
    </article>
  );
}

function MarqueeColumn({
  items,
  duration,
}: {
  items: readonly Testimonial[];
  duration: number;
}) {
  const loop = [...items, ...items];

  return (
    <div className="relative h-[32rem] overflow-hidden md:h-[36rem]">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16 bg-gradient-to-b from-[#0a0908] to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-16 bg-gradient-to-t from-[#0a0908] to-transparent" />

      <div
        className="testimonials-marquee flex flex-col gap-4"
        style={
          {
            ["--marquee-duration" as string]: `${duration}s`,
          } as React.CSSProperties
        }
      >
        {loop.map((item, i) => (
          <TestimonialCard key={`${item.id}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

/**
 * Testimonials — center copy + photo; left/right columns scroll upward.
 */
export function TestimonialsSection() {
  const { testimonials } = siteContent;

  const leftItems = testimonials.items.filter((_, i) => i % 2 === 0);
  const rightItems = testimonials.items.filter((_, i) => i % 2 === 1);

  return (
    <section
      id="testimonials"
      data-section="testimonials"
      className="relative z-20 overflow-hidden py-16 md:py-20 lg:py-24"
      aria-labelledby="testimonials-title"
      style={{
        background:
          "linear-gradient(180deg, #080706 0%, #0a0908 45%, #0c0a08 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 50% 40% at 50% 45%, rgba(215,168,102,0.08) 0%, transparent 65%)",
        }}
      />

      <div className="page-container relative z-10">
        <Reveal>
          <p className="mb-10 flex items-center justify-center gap-3 text-[11px] tracking-[0.22em] uppercase md:mb-12">
            <span className="text-electric">{testimonials.index}</span>
            <span className="h-px w-8 bg-electric-soft/50" aria-hidden="true" />
            <span className="text-foreground-subtle">{testimonials.eyebrow}</span>
          </p>

          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="hidden lg:col-span-3 lg:block">
              <MarqueeColumn items={leftItems} duration={42} />
            </div>

            <div className="flex flex-col items-center text-center lg:col-span-6">
              <h2
                id="testimonials-title"
                className="max-w-md text-[clamp(1.75rem,3.2vw,2.75rem)] font-light leading-[1.2] tracking-[-0.02em] text-foreground"
              >
                {testimonials.titleBefore}{" "}
                <span className="font-serif italic text-warm">
                  {testimonials.titleItalic}
                </span>
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-foreground-muted">
                {testimonials.description}
              </p>

              <div className="relative mt-8 aspect-[4/3] w-full max-w-md overflow-hidden rounded-2xl border border-white/10">
                <Image
                  src={testimonials.image}
                  alt={testimonials.imageAlt}
                  fill
                  sizes="(max-width: 768px) 90vw, 420px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0908]/40 via-transparent to-transparent" />
              </div>

              <div className="mt-10 w-full lg:hidden">
                <MarqueeColumn items={testimonials.items} duration={48} />
              </div>
            </div>

            <div className="hidden lg:col-span-3 lg:block">
              <MarqueeColumn items={rightItems} duration={48} />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
