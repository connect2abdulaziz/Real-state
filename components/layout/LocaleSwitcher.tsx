"use client";

import { useMarketingLocale } from "@/components/layout/MarketingLocaleProvider";
import type { MarketingLocale } from "@/data/content/locale";

const LABELS: Record<MarketingLocale, { label: string; fr: string; en: string }> =
  {
    fr: { label: "Langue", fr: "FR", en: "EN" },
    en: { label: "Language", fr: "FR", en: "EN" },
  };

/**
 * FR | EN toggle for marketing copy (cookie + localStorage + refresh).
 * Does not rewrite /admin, /api, or /valuation routes.
 */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useMarketingLocale();
  const t = LABELS[locale];

  return (
    <div
      className={[
        "inline-flex items-center gap-1 rounded-full border border-white/18 bg-white/[0.07] p-1 backdrop-blur-[6px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      role="group"
      aria-label={t.label}
    >
      {(["fr", "en"] as const).map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            className={
              active
                ? "rounded-full bg-white px-2.5 py-1 text-[11px] font-medium tracking-[0.08em] text-black"
                : "rounded-full px-2.5 py-1 text-[11px] tracking-[0.08em] text-white/75 transition-colors hover:text-white"
            }
            aria-pressed={active}
          >
            {t[code]}
          </button>
        );
      })}
    </div>
  );
}
