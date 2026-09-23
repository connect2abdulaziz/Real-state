import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";
import { Reveal } from "@/components/motion/Reveal";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 11v5M8 8v.01M12 16v-5c1.5 0 3 1 3 3v2" />
    </svg>
  );
}

const socialIcons: Record<
  string,
  (props: { className?: string }) => React.JSX.Element
> = {
  Instagram: InstagramIcon,
  LinkedIn: LinkedInIcon,
};

/**
 * Contact — large dual-tone headline + fused CTA inline in the line + socials/footer.
 */
export function ContactSection() {
  const {
    index,
    eyebrow,
    tagline,
    line1Light,
    line1Muted,
    line2Before,
    line2After,
    cta,
    ctaHref,
    body,
    email,
    socials,
    chips,
    footerNav,
    footerNote,
  } = siteContent.contact;

  return (
    <section
      id="contact"
      data-section="contact"
      className="relative z-20 overflow-hidden bg-background pt-20 pb-10 md:pt-28 md:pb-12"
      aria-labelledby="contact-title"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 20% 35%, rgba(215,168,102,0.11) 0%, transparent 58%), radial-gradient(ellipse 42% 38% at 85% 65%, rgba(183,172,127,0.07) 0%, transparent 55%)",
        }}
      />

      <div className="page-container relative z-10">
        <Reveal>
          {/* Meta row */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] tracking-[0.2em] text-foreground-subtle uppercase">
              ({index}) {eyebrow}
            </p>
            <p className="hidden text-[10px] tracking-[0.22em] text-foreground-subtle uppercase sm:block">
              {tagline}
            </p>
          </div>

          {/* Headline + body — two lines: title, then value [cta] with us */}
          <div className="mt-10 flex flex-col gap-10 md:mt-14 md:flex-row md:items-end md:justify-between md:gap-12 lg:gap-16">
            <h2
              id="contact-title"
              className="min-w-0 flex-1 text-[clamp(1.85rem,5.5vw,4.75rem)] font-light leading-[1.08] tracking-[-0.035em]"
            >
              <span className="block md:whitespace-nowrap">
                <span className="text-foreground">{line1Light} </span>
                <span className="font-serif italic text-warm">{line1Muted}</span>
              </span>

              <span className="mt-1 flex flex-wrap items-center gap-x-[0.28em] gap-y-2 md:mt-2 md:flex-nowrap md:whitespace-nowrap">
                <span className="text-foreground-muted">{line2Before}</span>
                <FusedCtaButton href={ctaHref} label={cta} inline />
                <span className="text-foreground">{line2After}</span>
              </span>
            </h2>

            <p className="max-w-70 shrink-0 text-sm leading-relaxed text-foreground-muted md:pb-1.5 md:text-right md:text-[13px]">
              {body}
            </p>
          </div>

          {/* Chips + socials */}
          <div className="mt-14 flex flex-col gap-8 md:mt-20 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/18 px-3.5 py-1.5 text-[11px] tracking-wide text-foreground-muted"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-10">
                {socials.map((s) => {
                  const Icon = socialIcons[s.label];
                  return (
                    <a
                      key={s.label}
                      href={s.href}
                      className="group inline-flex items-center gap-2.5 text-sm text-foreground transition-colors hover:text-warm"
                    >
                      {Icon ? (
                        <Icon className="size-4 text-foreground-muted transition-colors group-hover:text-warm" />
                      ) : null}
                      <span className="tracking-wide">{s.handle}</span>
                    </a>
                  );
                })}
              </div>

              <a
                href={`mailto:${email}`}
                className="mt-5 inline-block text-sm text-electric transition-colors hover:text-warm"
              >
                {email}
              </a>
            </div>
          </div>

          {/* Footer bar */}
          <div className="mt-16 flex flex-col gap-6 border-t border-white/10 pt-8 md:mt-20 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <svg
                width="12"
                height="12"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
                className="text-foreground"
              >
                <path
                  d="M7 0L14 7L7 14L0 7L7 0Z"
                  fill="currentColor"
                  fillOpacity="0.9"
                />
              </svg>
              <span className="text-[12px] font-medium tracking-[0.16em] uppercase text-foreground">
                {siteContent.brand.name}
              </span>
            </div>

            <nav className="flex flex-wrap gap-x-6 gap-y-2" aria-label="Footer">
              {footerNav.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-[12px] text-foreground-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <p className="text-[11px] tracking-wide text-foreground-subtle md:text-right">
              {footerNote}
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
