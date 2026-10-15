import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";

/**
 * Hero offer — conversion hook raised into the upper-middle of the viewport.
 * Primary CTA stays on /valuation (product entry).
 */
export function HeroContent() {
  const {
    titleBefore,
    titleItalic,
    description,
    cta,
    ctaHref,
    secondary,
  } = siteContent.hero;

  return (
    <div data-component="hero-content" className="max-w-2xl">
      <h1
        className="overflow-hidden leading-[1.08] tracking-[-0.02em]"
        aria-label={`${titleBefore} ${titleItalic}`}
      >
        <span
          data-reveal="line-1"
          className="block font-sans font-light text-foreground"
          style={{ fontSize: "clamp(2rem, 4.2vw, 3.5rem)" }}
        >
          {titleBefore}{" "}
          <span className="font-serif italic text-warm">{titleItalic}</span>
        </span>
      </h1>

      <p
        data-hero="description"
        className="mt-4 max-w-md text-sm leading-relaxed text-foreground-muted md:text-base"
      >
        {description}
      </p>

      <div data-hero="cta" className="mt-7">
        <FusedCtaButton href={ctaHref} label={cta} />
      </div>

      {secondary ? (
        <p
          data-hero="secondary"
          className="mt-6 text-[12px] tracking-[0.14em] text-foreground-subtle uppercase"
        >
          {secondary}
        </p>
      ) : null}
    </div>
  );
}
