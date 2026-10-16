import { contentEn, type SiteContent } from "./en";
import { contentFr } from "./fr";

export function getSiteContent(locale: string): SiteContent {
  if (locale === "en") return contentEn as unknown as SiteContent;
  return contentFr as unknown as SiteContent;
}

export type { SiteContent };
export { contentEn, contentFr };
/** Alias for legacy imports still using `siteContent` (English fallback). */
export { contentEn as siteContent };

export type { MarketingLocale } from "./locale";
export {
  normalizeMarketingLocale,
  DEFAULT_MARKETING_LOCALE,
  LOCALE_COOKIE,
  LOCALE_STORAGE_KEY,
} from "./locale";

/** Server-only: import from `@/data/content/getMarketingLocale` — not here (uses next/headers). */
