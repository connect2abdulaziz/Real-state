"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_MARKETING_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeMarketingLocale,
  readLocaleFromDocumentCookie,
  writeLocalePreference,
  type MarketingLocale,
} from "@/data/content/locale";

type Ctx = {
  locale: MarketingLocale;
  setLocale: (locale: MarketingLocale) => void;
};

const MarketingLocaleContext = createContext<Ctx | null>(null);

export function MarketingLocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: MarketingLocale;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<MarketingLocale>(initialLocale);

  // Prefer stored client preference on mount (covers expired cookie).
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const fromStorage = stored ? normalizeMarketingLocale(stored) : null;
    const fromCookie = readLocaleFromDocumentCookie();
    const next = fromStorage ?? fromCookie ?? initialLocale;
    if (next !== locale) {
      setLocaleState(next);
      writeLocalePreference(next);
      if (next !== initialLocale) router.refresh();
    } else {
      writeLocalePreference(next);
    }
    document.documentElement.lang = next === "fr" ? "fr-CA" : "en";
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount sync only
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "fr" ? "fr-CA" : "en";
  }, [locale]);

  const setLocale = useCallback(
    (next: MarketingLocale) => {
      if (next === locale) return;
      writeLocalePreference(next);
      setLocaleState(next);
      router.refresh();
    },
    [locale, router],
  );

  const value = useMemo(() => ({ locale, setLocale }), [locale, setLocale]);

  return (
    <MarketingLocaleContext.Provider value={value}>
      {children}
    </MarketingLocaleContext.Provider>
  );
}

export function useMarketingLocale(): Ctx {
  const ctx = useContext(MarketingLocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_MARKETING_LOCALE,
      setLocale: () => {},
    };
  }
  return ctx;
}
