import { cookies } from "next/headers";
import {
  DEFAULT_MARKETING_LOCALE,
  LOCALE_COOKIE,
  normalizeMarketingLocale,
  type MarketingLocale,
} from "./locale";

/** Server-side marketing locale from cookie (FR default). */
export function getMarketingLocale(): MarketingLocale {
  const raw = cookies().get(LOCALE_COOKIE)?.value;
  if (!raw) return DEFAULT_MARKETING_LOCALE;
  return normalizeMarketingLocale(raw);
}
