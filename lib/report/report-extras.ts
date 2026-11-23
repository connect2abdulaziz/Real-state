import type { FeatureAdjustment, ValuationRecord } from "@/lib/types";

/**
 * Fields that live primarily in raw_model_output (Fix 3–6) but power the
 * PDF / UI report. Falls back to top-level columns when present.
 */
export type ReportExtras = {
  estimated_value_mid: number | null;
  recommended_list_price_cad: number | null;
  expected_selling_price_cad: number | null;
  methodology: string | null;
  key_value_drivers: string[];
  feature_adjustments: FeatureAdjustment[];
  comps_base_cad: number | null;
  data_quality: string | null;
};

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return v;
  if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) {
    const n = Number(v);
    return n > 0 ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  return null;
}

function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
}

function adjustments(v: unknown): FeatureAdjustment[] {
  if (!Array.isArray(v)) return [];
  const out: FeatureAdjustment[] = [];
  for (const row of v) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    if (typeof r.factor !== "string") continue;
    if (r.direction !== "increase" && r.direction !== "decrease") continue;
    out.push({
      factor: r.factor,
      direction: r.direction,
      amount_cad: typeof r.amount_cad === "number" ? r.amount_cad : 0,
      percent: typeof r.percent === "number" ? r.percent : 0,
      basis: typeof r.basis === "string" ? r.basis : "",
    });
  }
  return out;
}

export function extractReportExtras(valuation: ValuationRecord): ReportExtras {
  const raw = (valuation.raw_model_output || {}) as Record<string, unknown>;

  const mid =
    num(valuation.estimated_value_mid) ??
    num(raw.estimated_value_mid) ??
    (valuation.estimated_value_low != null &&
    valuation.estimated_value_high != null
      ? Math.round(
          (Number(valuation.estimated_value_low) +
            Number(valuation.estimated_value_high)) /
            2
        )
      : null);

  return {
    estimated_value_mid: mid,
    recommended_list_price_cad:
      num(valuation.recommended_list_price_cad) ??
      num(raw.recommended_list_price_cad),
    expected_selling_price_cad:
      num(valuation.expected_selling_price_cad) ??
      num(raw.expected_selling_price_cad) ??
      mid,
    methodology: str(valuation.methodology) ?? str(raw.methodology),
    key_value_drivers:
      (valuation.key_value_drivers?.length
        ? valuation.key_value_drivers
        : null) ?? stringArray(raw.key_value_drivers),
    feature_adjustments:
      (valuation.feature_adjustments?.length
        ? valuation.feature_adjustments
        : null) ?? adjustments(raw.feature_adjustments),
    comps_base_cad: num(valuation.comps_base_cad) ?? num(raw.comps_base_cad),
    data_quality:
      str(raw._data_quality) ??
      str((raw._reconcile as { data_quality?: string } | undefined)?.data_quality),
  };
}
