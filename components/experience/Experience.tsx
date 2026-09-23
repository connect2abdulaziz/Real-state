import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Experience — 2×2 editorial grid matching the Velora reference alignment:
 *
 *   (01) / LABEL     |  Large dual-tone headline
 *   Small body copy  |  CTA button  ← same baseline
 */
export function Experience() {
  const { index, eyebrow, headline, body, cta, ctaHref } =
    siteContent.experience;

  return (
    <section
      id="experience"
      data-section="experience"
      className="relative z-20 min-h-svh bg-background"
      aria-labelledby="experience-title"
    >
      <div className="page-container flex min-h-svh flex-col py-16 md:py-20 lg:py-24">
        {/*
          Desktop: true 2×2 grid so bottom paragraph + CTA share one row/baseline.
          Mobile: stacks label → headline → body → CTA.
        */}
        <Reveal className="grid flex-1 grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:content-between">
          {/* Top-left — section index */}
          <div className="lg:col-span-4 lg:row-start-1">
            <p className="text-[11px] tracking-[0.22em] text-foreground-subtle uppercase">
              ({index}) / {eyebrow}
            </p>
          </div>

          {/* Top-right — headline */}
          <div className="lg:col-span-8 lg:row-start-1 lg:pl-6">
            <h2
              id="experience-title"
              className="max-w-4xl text-[clamp(1.55rem,3.2vw,2.85rem)] leading-[1.22] tracking-[-0.02em] font-light"
            >
              {headline.map((line, i) => (
                <span key={i} className="block md:whitespace-nowrap">
                  {line.map((part, j) => (
                    <span
                      key={j}
                      className={
                        part.tone === "strong"
                          ? "text-foreground"
                          : "text-foreground-muted"
                      }
                    >
                      {part.text}
                    </span>
                  ))}
                </span>
              ))}
            </h2>
          </div>

          {/* Bottom-left — body (same row as CTA) */}
          <div className="flex items-end lg:col-span-4 lg:row-start-2">
            <p className="max-w-sm text-sm leading-[1.75] text-foreground-muted">
              {body}
            </p>
          </div>

          {/* Bottom-right — CTA (same baseline as body) */}
          <div className="flex items-end lg:col-span-8 lg:row-start-2 lg:pl-6">
            <FusedCtaButton href={ctaHref} label={cta} />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
