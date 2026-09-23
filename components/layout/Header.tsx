import { siteContent } from "@/data/content";
import { FusedCtaButton } from "@/components/ui/FusedCtaButton";

/**
 * Site header — glassmorphic center nav + fused SVG CTA.
 */
export function Header() {
  const { brand, nav } = siteContent;

  return (
    <header
      data-hero="header"
      className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-5 py-5 md:px-10 md:py-6"
      aria-label="Primary navigation"
    >
      <div data-hero="logo" className="flex items-center gap-2">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
          className="shrink-0 text-foreground"
        >
          <path
            d="M7 0L14 7L7 14L0 7L7 0Z"
            fill="currentColor"
            fillOpacity="0.9"
          />
        </svg>
        <span className="text-[13px] font-medium tracking-[0.18em] uppercase text-foreground">
          {brand.name}
        </span>
      </div>

      <nav
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-5 md:flex"
        aria-label="Main"
      >
        {nav.map((item, i) => {
          const isActive = i === 0;
          return (
            <a
              key={item.href}
              data-hero="nav-item"
              href={item.href}
              className={
                isActive
                  ? "rounded-full bg-white px-4 py-[7px] text-[12px] tracking-[0.08em] text-black shadow-[0_2px_12px_rgba(0,0,0,0.15)] transition-all duration-200 hover:bg-white/90"
                  : "rounded-full border border-white/18 bg-white/[0.07] px-4 py-[7px] text-[12px] tracking-[0.08em] text-white/85 backdrop-blur-[6px] transition-all duration-200 hover:border-white/30 hover:bg-white/[0.12] hover:text-white"
              }
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <FusedCtaButton
        href="/valuation"
        label="Start Valuation"
        dataAttr="header-cta"
        className="hidden md:block"
      />
    </header>
  );
}
