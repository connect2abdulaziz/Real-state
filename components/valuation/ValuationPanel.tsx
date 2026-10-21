"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { ValuationRecord } from "@/lib/types";
import { ConsultationCTA } from "@/components/valuation/ConsultationCTA";
import type { Locale } from "@/lib/i18n/copy";
import { UI } from "@/lib/i18n/copy";

function formatCurrency(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "fr" ? "fr-CA" : "en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function ValuationPanel({
  loading,
  valuation,
  valuationError,
  conversationId,
  propertyId,
  homeownerId,
  locale = "en",
}: {
  loading: boolean;
  valuation: ValuationRecord | null;
  valuationError: string | null;
  conversationId?: string | null;
  propertyId?: string | null;
  homeownerId?: string | null;
  locale?: Locale;
}) {
  const copy = UI[locale];
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function downloadReport() {
    if (!valuation?.id) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const res = await fetch(`/api/reports/${valuation.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers
          .get("Content-Disposition")
          ?.match(/filename="(.+)"/)?.[1] || "Estate-Valora-Report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Download failed"
      );
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-md border border-white/10 bg-gradient-to-br from-surface-soft to-surface p-6 sm:p-8 flex items-center gap-4">
        <div className="w-5 h-5 rounded-full border-2 border-electric border-t-transparent animate-spin shrink-0" />
        <div>
          <p className="text-[14px] text-foreground font-medium">
            {copy.preparingEstimate}
          </p>
          <p className="text-[13px] text-foreground-muted mt-1">
            {copy.preparingEstimateHint}
          </p>
        </div>
      </div>
    );
  }

  if (!valuation || valuation.status === "failed") {
    return (
      <div className="rounded-md border border-white/10 bg-surface-soft p-5 sm:p-6 flex gap-3">
        <AlertTriangle size={18} className="text-warm shrink-0 mt-0.5" />
        <div>
          <p className="text-[14px] font-semibold text-foreground mb-1">
            {copy.estimateUnavailable}
          </p>
          <p className="text-[13px] text-foreground-muted leading-relaxed">
            {copy.estimateUnavailableBody}
            {valuationError ? ` (${valuationError})` : ""}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border border-white/10 overflow-hidden mb-5 min-w-0">
        <div className="relative px-5 sm:px-8 py-7 sm:py-9 bg-gradient-to-br from-[#12181f] via-surface to-[#0a0e12] border-b border-white/8">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 15% 20%, rgba(183,172,127,0.18), transparent 55%)",
            }}
          />
          <div className="relative">
            <p className="text-[11px] font-medium text-electric uppercase tracking-[0.16em] mb-3 flex items-center gap-2">
              <Sparkles size={12} /> {copy.preliminaryEstimate}
            </p>
            <p className="font-serif text-[clamp(1.75rem,4vw,2.75rem)] leading-[1.1] text-foreground tracking-tight break-words">
              {formatCurrency(valuation.estimated_value_low, locale)}
              <span className="text-foreground-muted font-sans text-[0.55em] mx-2 sm:mx-3">
                –
              </span>
              {formatCurrency(valuation.estimated_value_high, locale)}
            </p>
            <p className="mt-3 text-[13px] text-foreground-muted">
              {copy.confidence}:{" "}
              <span className="text-foreground capitalize">
                {valuation.confidence}
              </span>
            </p>
            <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                type="button"
                onClick={downloadReport}
                disabled={downloading}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white text-background text-[13px] font-medium disabled:opacity-50 shrink-0"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {downloading ? copy.preparingPdf : copy.downloadReport}
              </button>
              <p className="text-[12px] text-foreground-muted leading-relaxed max-w-md">
                {copy.pdfHint}
              </p>
            </div>
            {downloadError && (
              <p className="text-[12px] text-warm mt-3 break-words">
                {downloadError}
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface-soft p-5 sm:p-8 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.14em] text-electric mb-3">
            {copy.explanation}
          </p>
          <p className="text-[14px] sm:text-[15px] text-foreground leading-relaxed mb-7 max-w-4xl break-words">
            {valuation.explanation}
          </p>

          <div className="flex flex-col gap-5">
            {valuation.factors_increasing_value.length > 0 && (
              <div className="rounded-md border border-white/8 bg-background/40 p-4 sm:p-5 min-w-0">
                <p className="text-[12px] font-semibold text-electric flex items-center gap-1.5 mb-3">
                  <TrendingUp size={14} className="shrink-0" />{" "}
                  {copy.factorsIncreasing}
                </p>
                <ul className="space-y-2.5">
                  {valuation.factors_increasing_value.map((f, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground-muted break-words"
                    >
                      <span className="text-foreground font-medium">
                        {f.factor}
                      </span>
                      <span className="text-foreground-subtle"> — </span>
                      {f.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {valuation.factors_decreasing_value.length > 0 && (
              <div className="rounded-md border border-white/8 bg-background/40 p-4 sm:p-5 min-w-0">
                <p className="text-[12px] font-semibold text-warm flex items-center gap-1.5 mb-3">
                  <TrendingDown size={14} className="shrink-0" />{" "}
                  {copy.factorsDecreasing}
                </p>
                <ul className="space-y-2.5">
                  {valuation.factors_decreasing_value.map((f, i) => (
                    <li
                      key={i}
                      className="text-[13px] text-foreground-muted break-words"
                    >
                      <span className="text-foreground font-medium">
                        {f.factor}
                      </span>
                      <span className="text-foreground-subtle"> — </span>
                      {f.explanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {(valuation.property_strengths?.length > 0 ||
            valuation.potential_considerations?.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6 mt-5">
              {valuation.property_strengths?.length > 0 && (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-foreground-subtle mb-2">
                    {copy.strengths}
                  </p>
                  <ul className="space-y-1.5">
                    {valuation.property_strengths.map((s, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-foreground-muted break-words"
                      >
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {valuation.potential_considerations?.length > 0 && (
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-foreground-subtle mb-2">
                    {copy.considerations}
                  </p>
                  <ul className="space-y-1.5">
                    {valuation.potential_considerations.map((s, i) => (
                      <li
                        key={i}
                        className="text-[13px] text-foreground-muted break-words"
                      >
                        · {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-7 pt-5 border-t border-white/10 text-[12px] leading-relaxed text-foreground-muted break-words max-w-4xl">
            {valuation.limitations} {copy.disclaimer}
          </div>
        </div>
      </div>

      <ConsultationCTA
        conversationId={conversationId ?? null}
        propertyId={propertyId}
        homeownerId={homeownerId}
        valuationId={valuation.id}
        locale={locale}
      />
    </>
  );
}
