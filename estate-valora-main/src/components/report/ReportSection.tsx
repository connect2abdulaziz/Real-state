import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";
import { Reveal } from "@/components/motion/Reveal";

const floaterPosition: Record<string, string> = {
  "left-top": "left-0 top-[6%] md:-left-8 lg:-left-14 xl:-left-16",
  "right-top": "right-0 top-[10%] md:-right-8 lg:-right-12 xl:-right-16",
  "left-bottom": "left-0 bottom-[16%] md:-left-6 lg:-left-12 xl:-left-14",
  "right-bottom": "right-0 bottom-[10%] md:-right-8 lg:-right-14 xl:-right-16",
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
 * Valuation report — Experience-style 2-column alignment:
 *
 *   Left:  index / title / description / CTA (same vertical axis)
 *   Right: sample report + floating HUD chips
 */
export function ReportSection() {
  const {
    index,
    eyebrow,
    title,
    description,
    sample,
    floaters,
    cta,
    ctaHref,
  } = siteContent.report;

  return (
    <section
      id="report"
      data-section="report"
      className="relative z-20 min-h-svh overflow-hidden bg-background"
      aria-labelledby="report-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 45% 50% at 72% 50%, rgba(44,156,197,0.09) 0%, transparent 65%), radial-gradient(ellipse 35% 40% at 70% 55%, rgba(215,168,102,0.07) 0%, transparent 60%)",
        }}
      />

      <div className="page-container relative z-10 flex min-h-svh flex-col py-16 md:py-20 lg:py-24">
        {/*
          2×2-style split (like Experience):
          Left column = editorial stack + CTA
          Right column = report object
        */}
        <Reveal className="grid flex-1 grid-cols-1 items-stretch gap-12 lg:grid-cols-12 lg:gap-10">
          {/* ── Left — section copy + CTA ─────────────────── */}
          <div className="flex flex-col lg:col-span-5">
            <div>
              <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
                <span className="text-electric">{index}</span>
                <span
                  className="h-px w-8 bg-electric-soft/50"
                  aria-hidden="true"
                />
                <span className="text-foreground-subtle">{eyebrow}</span>
              </p>

              <h2
                id="report-title"
                className="mt-5 max-w-md text-[clamp(1.85rem,3.2vw,2.85rem)] font-light leading-[1.15] tracking-[-0.02em] text-foreground"
              >
                {title}
              </h2>

              <p className="mt-5 max-w-sm text-sm leading-[1.75] text-foreground-muted">
                {description}
              </p>
            </div>

            {/* Same vertical axis as the left copy */}
            <div className="mt-auto pt-12 lg:pt-16">
              <FusedCtaButton href={ctaHref} label={cta} />
            </div>
          </div>

          {/* ── Right — report centered in its column (balanced) */}
          <div className="relative flex items-center justify-center lg:col-span-7">
            <div className="relative w-full max-w-[20.5rem] md:max-w-[22rem]">
              {/* Floating chips — sit outside the lean report */}
              {floaters.map((chip, i) => (
                <div
                  key={chip.label}
                  className={[
                    "pointer-events-none absolute z-20 hidden md:block",
                    floaterPosition[chip.position] ?? "",
                    i % 2 === 0 ? "float-chip-a" : "float-chip-b",
                  ].join(" ")}
                  style={
                    i === 1
                      ? { animationDelay: "0.6s" }
                      : i === 2
                        ? { animationDelay: "1.1s" }
                        : i === 3
                          ? { animationDelay: "0.3s" }
                          : undefined
                  }
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
              ))}

              {/* Bright golden bloom behind report — circular spill */}
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(232,196,120,0.55) 0%, rgba(215,168,102,0.28) 38%, rgba(215,168,102,0.08) 62%, transparent 72%)",
                }}
                aria-hidden="true"
              />
              <div
                className="pointer-events-none absolute left-1/2 top-[48%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,220,150,0.65) 0%, rgba(215,168,102,0.25) 50%, transparent 75%)",
                }}
                aria-hidden="true"
              />

              <article
                className="relative z-10 w-full rounded-2xl border border-white/15 px-5 py-7 backdrop-blur-xl md:px-6 md:py-8"
                style={glassReport}
                aria-label="Sample valuation report preview"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-electric/85 uppercase">
                      {sample.brand}
                    </p>
                    <p className="mt-1 text-xs text-foreground-muted">
                      {sample.docLabel}
                    </p>
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-warm/35 bg-warm/10">
                    <span className="text-[10px] tracking-wider text-warm">
                      EV
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-sm text-foreground-muted">
                    {sample.propertyType}
                  </p>
                  <p className="mt-1 text-lg text-foreground">
                    {sample.property}
                  </p>
                </div>

                <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4">
                  <p className="text-[10px] tracking-[0.18em] text-foreground-subtle uppercase">
                    {sample.rangeLabel}
                  </p>
                  <p
                    className="mt-2 font-light tracking-tight text-foreground"
                    style={{ fontSize: "clamp(1.6rem, 3.2vw, 2.1rem)" }}
                  >
                    <span className="text-warm">{sample.rangeLow}</span>
                    <span className="mx-2 text-foreground-subtle">–</span>
                    <span>{sample.rangeHigh}</span>
                  </p>
                  <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full w-[62%] rounded-full"
                      style={{
                        background:
                          "linear-gradient(90deg, rgba(215,168,102,0.85) 0%, rgba(114,215,255,0.7) 100%)",
                      }}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-[10px] tracking-[0.18em] text-electric-soft uppercase">
                    Property strengths
                  </p>
                  <ul className="mt-3 space-y-2">
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

                <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-relaxed text-foreground-subtle">
                  {sample.limitation}
                </p>
              </article>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
