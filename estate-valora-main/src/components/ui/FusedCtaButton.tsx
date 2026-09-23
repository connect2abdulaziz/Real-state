type FusedCtaButtonProps = {
  href: string;
  label?: string;
  className?: string;
  /** Optional data attribute for GSAP targeting (header entrance) */
  dataAttr?: string;
  /** Inline in a headline — scales with surrounding text */
  inline?: boolean;
};

/**
 * Fused pill + circle CTA — shared across the site.
 * Arrow is drawn in the SVG so it stays centered in the circle at any scale.
 */
export function FusedCtaButton({
  href,
  label = "Start Valuation",
  className = "",
  dataAttr,
  inline = false,
}: FusedCtaButtonProps) {
  return (
    <div
      {...(dataAttr ? { "data-hero": dataAttr } : {})}
      className={[
        inline ? "relative mx-[0.12em] inline-block align-middle" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <a
        href={href}
        aria-label={label}
        className="group relative inline-block"
        style={{ filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.5))" }}
      >
        <svg
          viewBox="0 0 220 48"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={[
            "block transition-opacity duration-200 group-hover:opacity-85",
            inline ? "h-[0.62em] w-auto" : "h-[46px] w-[210px]",
          ].join(" ")}
        >
          <path
            d="M 22 2 L 148 2 C 156 2 164 12 172 12 C 180 12 184 2 196 2 A 22 22 0 0 1 196 46 C 184 46 180 36 172 36 C 164 36 156 46 148 46 L 22 46 A 22 22 0 0 1 22 2 Z"
            fill="white"
          />
          <circle cx="196" cy="24" r="15" fill="#07090b" />
          {/* Arrow centered on circle (196, 24) */}
          <g
            fill="none"
            stroke="white"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M190.5 29.5 L201.5 18.5" />
            <path d="M194 18.5 H201.5 V26" />
          </g>
        </svg>

        <span
          className={[
            "pointer-events-none absolute left-0 top-0 flex h-full items-center font-semibold uppercase text-black",
            inline
              ? "pl-[0.35em] pr-[0.9em] text-[0.22em] tracking-[0.1em]"
              : "pl-5 pr-[52px] text-[10px] tracking-[0.12em]",
          ].join(" ")}
        >
          {label}
        </span>
      </a>
    </div>
  );
}
