"use client";

import { getSiteContent } from "@/data/content";
import { useMarketingLocale } from "@/components/layout/MarketingLocaleProvider";

/** Client-side site copy for the active marketing locale. */
export function useSiteContent() {
  const { locale } = useMarketingLocale();
  return getSiteContent(locale);
}
