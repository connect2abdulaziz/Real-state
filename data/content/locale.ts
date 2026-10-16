export type MarketingLocale = "en" | "fr";

/** Shared with estate-valora landing — valuation can read the same keys. */
export const LOCALE_COOKIE = "NEXT_LOCALE";
export const LOCALE_STORAGE_KEY = "estate-valora-locale";

export function normalizeMarketingLocale(
  v: string | null | undefined,
): MarketingLocale {
  return v === "en" ? "en" : "fr";
}

/** Default marketing locale (Québec-first). */
export const DEFAULT_MARKETING_LOCALE: MarketingLocale = "fr";

export function readLocaleFromDocumentCookie(): MarketingLocale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`),
  );
  if (!match?.[1]) return null;
  return normalizeMarketingLocale(decodeURIComponent(match[1]));
}

export function writeLocalePreference(locale: MarketingLocale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    /* private mode */
  }
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
