"use client";

import { useSiteContent } from "@/data/content/useSiteContent";
import { ReportScene } from "@/components/report/ReportScene";
import { useMarketingLocale } from "@/components/layout/MarketingLocaleProvider";

/**
 * Feeds locale marketing content into ReportScene.
 * CTAs stay on /valuation via content files.
 */
export function ReportSection() {
  const report = useSiteContent().report;
  const { locale } = useMarketingLocale();
  const strengthsLabel =
    locale === "fr" ? "Points forts de la propriété" : "Property strengths";

  return (
    <ReportScene
      index={report.index}
      eyebrow={report.eyebrow}
      title={report.title}
      description={report.description}
      sample={report.sample}
      floaters={report.floaters}
      cta={report.cta}
      ctaHref={report.ctaHref}
      strengthsLabel={strengthsLabel}
    />
  );
}
