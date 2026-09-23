import { siteContent } from "@/data/content";

/**
 * Hero copy — compact block, pinned bottom-left.
 * Longer headline with one italic accent word (Instrument Serif).
 */
export function HeroContent() {
  const { titleBefore, titleItalic, description, cta, ctaHref } =
    siteContent.hero;

  return (
    <div data-component="hero-content" className="max-w-xl">
      <h1
        className="overflow-hidden leading-[1.08] tracking-[-0.02em]"
        aria-label={`${titleBefore} ${titleItalic}`}
      >
        <span
          data-reveal="line-1"
          className="block font-sans font-light text-foreground"
          style={{ fontSize: "clamp(2.1rem, 3.8vw, 3.4rem)" }}
        >
          {titleBefore}{" "}
          <span className="font-serif italic">{titleItalic}</span>
        </span>
      </h1>

      <p
        data-hero="description"
        className="mt-4 max-w-sm text-sm leading-relaxed text-foreground-muted md:text-base"
      >
        {description}
      </p>

      <div data-hero="cta" className="mt-6">
        <a
          href={ctaHref}
          className="group inline-flex items-center gap-3 text-[13px] text-foreground"
        >
          <span className="border-b border-white/25 pb-px transition-colors duration-200 group-hover:border-white/60">
            {cta}
          </span>
          <span className="text-electric text-sm transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </a>
      </div>
    </div>
  );
}
