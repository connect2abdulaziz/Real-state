import Image from "next/image";
import { siteContent } from "@/data/content";

/** Vertical stagger: top / bottom / top */
const staggerClass = [
  "md:translate-y-0",
  "md:translate-y-10 lg:translate-y-14",
  "md:translate-y-0",
] as const;

/** Warm glow blobs behind each glass card (token: --warm #D7A866) */
const warmOrbClass = [
  "-left-6 top-8 h-36 w-36",
  "left-1/2 top-16 h-40 w-40 -translate-x-1/2",
  "-right-6 top-8 h-36 w-36",
] as const;

const glassStyle = {
  background:
    "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(215,168,102,0.06) 40%, rgba(255,255,255,0.03) 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), inset 1px 0 0 rgba(215,168,102,0.15), 0 12px 40px rgba(0,0,0,0.35)",
} as const;

/**
 * How it works — sticky photo + staggered glass steps.
 * Warm orbs sit behind the glass so frost picks up amber light.
 */
export function Process() {
  const { processSection, process } = siteContent;

  return (
    <section
      id="process"
      data-section="process"
      className="relative z-20 min-h-[130svh]"
      aria-labelledby="process-title"
    >
      <div
        className="sticky top-0 h-svh w-full overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src={processSection.background}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute inset-0 bg-background/50" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/65 via-background/25 to-background/75" />
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "radial-gradient(ellipse 55% 45% at 75% 35%, rgba(215,168,102,0.22) 0%, transparent 65%)",
          }}
        />
      </div>

      <div className="page-container relative z-10 -mt-[100svh] flex min-h-[130svh] flex-col justify-center py-14 md:py-16 lg:py-20">
        {/* Tight gap under title */}
        <header className="mb-5 md:mb-6">
          <p className="flex items-center gap-3 text-[11px] tracking-[0.22em] uppercase">
            <span className="text-electric">{processSection.index}</span>
            <span
              className="h-px w-8 bg-electric-soft/60"
              aria-hidden="true"
            />
          </p>
          <h2
            id="process-title"
            className="mt-2 text-[clamp(2rem,4vw,3.25rem)] font-light tracking-[-0.02em] text-white"
          >
            {processSection.title}
          </h2>
        </header>

        {/* No flex-1 / content-center — that was creating the huge empty band */}
        <ol className="grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-6 lg:gap-8">
          {process.map((step, i) => (
            <li
              key={step.number}
              className={["relative", staggerClass[i] ?? ""].join(" ")}
            >
              {/* Warm tone behind glass */}
              <div
                className={[
                  "pointer-events-none absolute rounded-full blur-2xl",
                  warmOrbClass[i] ?? warmOrbClass[0],
                ].join(" ")}
                style={{
                  background:
                    "radial-gradient(circle, rgba(215,168,102,0.45) 0%, rgba(215,168,102,0.12) 45%, transparent 70%)",
                }}
                aria-hidden="true"
              />
              {/* Smaller secondary warm pill */}
              <div
                className="pointer-events-none absolute -bottom-2 right-8 h-16 w-24 rounded-full blur-xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(215,168,102,0.28) 0%, transparent 70%)",
                }}
                aria-hidden="true"
              />

              <div className="relative z-[1]">
                <div className="mb-3 flex items-center gap-3">
                  <span
                    className="rounded-full border border-electric/30 px-3 py-[5px] text-[10px] tracking-[0.18em] text-electric/90 uppercase backdrop-blur-md"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(114,215,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
                    }}
                  >
                    {step.tag}
                  </span>
                  <span
                    className="h-px flex-1 max-w-[3.5rem] bg-gradient-to-r from-electric-soft/50 to-transparent"
                    aria-hidden="true"
                  />
                  <span className="text-[10px] tracking-[0.2em] text-warm/80">
                    {step.number}
                  </span>
                </div>

                <div
                  className="rounded-2xl border border-white/20 px-5 py-6 backdrop-blur-[14px] transition-colors duration-300 hover:border-warm/30 md:min-h-[11rem]"
                  style={glassStyle}
                >
                  <h3 className="text-lg font-medium tracking-tight text-white md:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/70">
                    {step.description}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
