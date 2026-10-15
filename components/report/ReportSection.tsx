import { siteContent } from "@/data/content";
import { ReportScene } from "@/components/report/ReportScene";

/**
 * Thin shell — feeds marketing content into ReportScene.
 * Keeps product CTAs pointed at /valuation via siteContent.report.ctaHref.
 */
export function ReportSection() {
  const report = siteContent.report;

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
      strengthsLabel="Property strengths"
    />
  );
}
