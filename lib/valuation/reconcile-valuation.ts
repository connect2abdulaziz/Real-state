import type { z } from "zod";
import type { ValuationResultSchema } from "@/lib/valuation/schema";
import {
  bandMultiplierForQuality,
  clampConfidence,
  type DataQuality,
} from "@/lib/valuation/data-quality";

export type ValuationParsed = z.infer<typeof ValuationResultSchema>;

export type ReconcileOptions = {
  dataQuality?: DataQuality;
};

export type ReconcileMeta = {
  comps_base_cad: number;
  net_adjustment_cad: number;
  band_pct: number;
  band_cad: number;
  capped_adjustments: number;
  dropped_double_count: string[];
  mid_source: "recomputed" | "model_kept";
  data_quality?: DataQuality;
  confidence_clamped?: boolean;
  notes: string[];
};

/** Per-adjustment cap as share of comps base. */
const MAX_ADJ_PCT_OF_BASE = 0.08;
/** Absolute per-adjustment ceiling (CAD). */
const MAX_ADJ_CAD = 75_000;
/** Total net |adjustment| cap as share of base. */
const MAX_NET_PCT_OF_BASE = 0.15;
/** Absolute net ceiling (CAD). */
const MAX_NET_CAD = 150_000;

const BAND_BY_CONFIDENCE: Record<"low" | "medium" | "high", number> = {
  high: 0.05,
  medium: 0.08,
  low: 0.12,
};

const BEDROOM_FAMILY = ["bedroom", "chambre", "room count", "extra room"];
const BASEMENT_FAMILY = ["basement", "sous-sol"];
const LIVING_AREA_FAMILY = [
  "living area",
  "above-ground",
  "above ground",
  "sqft",
  "sq ft",
  "superficie",
  "floor area",
];

function normalizeFactorKey(factor: string): string {
  return factor.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchesFamily(factor: string, family: string[]): boolean {
  const key = normalizeFactorKey(factor);
  return family.some((token) => key.includes(token));
}

function signedCad(
  adj: ValuationParsed["feature_adjustments"][number],
  base: number
): number {
  const fromPct =
    Number.isFinite(adj.percent) && adj.percent !== 0
      ? (Math.abs(adj.percent) / 100) * base
      : 0;
  const raw = Math.max(Math.abs(adj.amount_cad) || 0, fromPct);
  const cap = Math.min(MAX_ADJ_CAD, MAX_ADJ_PCT_OF_BASE * base);
  const capped = Math.min(raw, cap);
  return adj.direction === "decrease" ? -capped : capped;
}

function roundCad(n: number): number {
  return Math.max(1_000, Math.round(n / 1_000) * 1_000);
}

function sharesToken(a: string, b: string): boolean {
  const ta = a.split(/[^a-z0-9àâäéèêëïîôùûüç]+/i).filter((t) => t.length > 3);
  const tb = new Set(
    b.split(/[^a-z0-9àâäéèêëïîôùûüç]+/i).filter((t) => t.length > 3)
  );
  return ta.some((t) => tb.has(t));
}

/**
 * Deduplicate overlapping adjustments (keep largest |CAD| per factor name).
 * Drop bedroom "extra space" when a basement adjustment already exists.
 * Prefer a single living-area line over duplicate size adjustments.
 */
export function dedupeAdjustments(
  adjustments: ValuationParsed["feature_adjustments"],
  base: number
): {
  kept: ValuationParsed["feature_adjustments"];
  dropped: string[];
} {
  const dropped: string[] = [];
  let list = [...adjustments];

  const hasBasement = list.some((a) =>
    matchesFamily(a.factor, BASEMENT_FAMILY)
  );
  if (hasBasement) {
    const bedroomHits = list.filter((a) =>
      matchesFamily(a.factor, BEDROOM_FAMILY)
    );
    for (const hit of bedroomHits) {
      const basis = `${hit.factor} ${hit.basis}`.toLowerCase();
      if (
        /basement|sous-sol|finished|extra\s+space|additional\s+living/.test(
          basis
        )
      ) {
        dropped.push(hit.factor);
        list = list.filter((a) => a !== hit);
      }
    }
  }

  // Collapse multiple living-area style rows into one (largest |CAD|)
  const livingRows = list.filter((a) =>
    matchesFamily(a.factor, LIVING_AREA_FAMILY)
  );
  if (livingRows.length > 1) {
    let best = livingRows[0];
    let bestAbs = Math.abs(signedCad(best, base));
    for (const row of livingRows.slice(1)) {
      const abs = Math.abs(signedCad(row, base));
      if (abs > bestAbs) {
        dropped.push(best.factor);
        best = row;
        bestAbs = abs;
      } else {
        dropped.push(row.factor);
      }
    }
    list = list.filter(
      (a) => !matchesFamily(a.factor, LIVING_AREA_FAMILY) || a === best
    );
  }

  const byName = new Map<string, (typeof list)[number]>();
  for (const adj of list) {
    const key = normalizeFactorKey(adj.factor);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, adj);
      continue;
    }
    const a = Math.abs(signedCad(adj, base));
    const b = Math.abs(signedCad(existing, base));
    if (a > b) {
      dropped.push(existing.factor);
      byName.set(key, adj);
    } else {
      dropped.push(adj.factor);
    }
  }

  return { kept: [...byName.values()], dropped };
}

function resolveBase(result: ValuationParsed): number {
  if (result.comps_base_cad > 0) return result.comps_base_cad;

  const mid = result.estimated_value_mid;
  if (!result.feature_adjustments.length) return mid;

  let net = 0;
  for (const adj of result.feature_adjustments) {
    const raw =
      Math.abs(adj.amount_cad) ||
      (adj.percent ? (Math.abs(adj.percent) / 100) * mid : 0);
    net += adj.direction === "decrease" ? -raw : raw;
  }
  const base = mid - net;
  return base > 0 ? base : mid;
}

function capNet(net: number, base: number): number {
  const cap = Math.min(MAX_NET_CAD, MAX_NET_PCT_OF_BASE * base);
  if (net > cap) return cap;
  if (net < -cap) return -cap;
  return net;
}

/**
 * Enforce: mid = comps_base ± capped adjustments; low/high = mid ± confidence band.
 * Lightly aligns narrative factor lists with adjustment directions.
 * Fix 5: clamp confidence / widen band when data quality is thin.
 */
export function reconcileValuation(
  result: ValuationParsed,
  options: ReconcileOptions = {}
): { result: ValuationParsed; meta: ReconcileMeta } {
  const notes: string[] = [];
  const quality = options.dataQuality ?? "adequate";
  const clampedConfidence = clampConfidence(result.confidence, quality);
  const confidenceClamped = clampedConfidence !== result.confidence;
  if (confidenceClamped) {
    notes.push(
      `Confidence clamped ${result.confidence} → ${clampedConfidence} (data quality: ${quality})`
    );
  }

  const base = roundCad(resolveBase(result));

  const { kept, dropped } = dedupeAdjustments(
    result.feature_adjustments,
    base
  );
  if (dropped.length) {
    notes.push(`Dropped overlapping adjustments: ${dropped.join(", ")}`);
  }

  const signed = kept.map((adj) => ({
    adj,
    cad: signedCad(adj, base),
  }));

  let net = signed.reduce((s, row) => s + row.cad, 0);
  const uncappedNet = net;
  net = capNet(net, base);
  if (net !== uncappedNet) {
    notes.push(
      `Net adjustment capped from ${Math.round(uncappedNet)} to ${Math.round(net)}`
    );
  }

  const scale =
    uncappedNet !== 0 && net !== uncappedNet
      ? Math.abs(net / uncappedNet)
      : 1;

  const normalizedAdj = signed.map(({ adj, cad }) => {
    const scaled = Math.round(Math.abs(cad) * scale);
    return {
      ...adj,
      amount_cad: scaled,
      percent: base > 0 ? Math.round((scaled / base) * 1000) / 10 : 0,
      direction: (cad < 0 ? "decrease" : "increase") as
        | "increase"
        | "decrease",
    };
  });

  const recomputedMid = roundCad(base + net);
  const modelMid = roundCad(result.estimated_value_mid);
  const midDeltaPct =
    modelMid > 0 ? Math.abs(recomputedMid - modelMid) / modelMid : 1;
  const useRecomputed =
    midDeltaPct > 0.02 || result.feature_adjustments.length > 0;
  const mid = useRecomputed ? recomputedMid : modelMid;
  if (useRecomputed && mid !== modelMid) {
    notes.push(`Mid recomputed from base+adj (${modelMid} → ${mid})`);
  }

  const bandPct = BAND_BY_CONFIDENCE[clampedConfidence];
  const qualityMult = bandMultiplierForQuality(quality);
  let bandCad = Math.max(mid * bandPct * qualityMult, 15_000);
  if (qualityMult > 1) {
    notes.push(
      `Range widened ×${qualityMult} for data quality (${quality})`
    );
  }

  const modelHalf =
    (result.estimated_value_high - result.estimated_value_low) / 2;
  if (modelHalf > bandCad && modelHalf <= bandCad * 1.5) {
    bandCad = modelHalf;
    notes.push("Used model range width (within 1.5× confidence band)");
  }

  const low = roundCad(Math.max(1_000, mid - bandCad));
  const high = roundCad(mid + bandCad);

  const incKeys = new Set(
    normalizedAdj
      .filter((a) => a.direction === "increase")
      .map((a) => normalizeFactorKey(a.factor))
  );
  const decKeys = new Set(
    normalizedAdj
      .filter((a) => a.direction === "decrease")
      .map((a) => normalizeFactorKey(a.factor))
  );

  let factorsInc = result.factors_increasing_value;
  let factorsDec = result.factors_decreasing_value;

  if (incKeys.size || decKeys.size) {
    factorsInc = factorsInc.filter((f) => {
      const k = normalizeFactorKey(f.factor);
      return ![...decKeys].some(
        (d) => k.includes(d) || d.includes(k) || sharesToken(k, d)
      );
    });
    factorsDec = factorsDec.filter((f) => {
      const k = normalizeFactorKey(f.factor);
      return ![...incKeys].some(
        (d) => k.includes(d) || d.includes(k) || sharesToken(k, d)
      );
    });
  }

  if (normalizedAdj.length && !factorsInc.length && !factorsDec.length) {
    for (const adj of normalizedAdj.slice(0, 3)) {
      const row = { factor: adj.factor, explanation: adj.basis };
      if (adj.direction === "increase") factorsInc = [...factorsInc, row];
      else factorsDec = [...factorsDec, row];
    }
    notes.push("Seeded narrative factors from feature_adjustments");
  }

  let limitations = result.limitations;
  if (quality === "thin" && !/thin|limited|insufficient|incertitude|données/i.test(limitations)) {
    limitations = `${limitations} Evidence was thin (few type-matched comps and/or incomplete market geo/period) — treat the range as indicative only.`;
    notes.push("Appended thin-data caveat to limitations");
  }

  // Fix 6: keep list / expected selling prices consistent with reconciled range
  let expected = roundCad(
    result.expected_selling_price_cad > 0
      ? result.expected_selling_price_cad
      : mid
  );
  expected = Math.min(high, Math.max(low, expected));
  // Prefer near mid when model drifted far
  if (Math.abs(expected - mid) / mid > 0.08) {
    expected = mid;
    notes.push("Expected selling price snapped toward mid");
  }

  let listPrice = roundCad(
    result.recommended_list_price_cad > 0
      ? result.recommended_list_price_cad
      : Math.min(high, mid * 1.03)
  );
  if (listPrice < mid) listPrice = roundCad(Math.min(high, mid * 1.02));
  if (listPrice > high) listPrice = high;
  if (listPrice < expected) listPrice = roundCad(Math.min(high, expected * 1.02));

  let keyDrivers = result.key_value_drivers?.filter(Boolean) ?? [];
  if (keyDrivers.length === 0) {
    keyDrivers = [
      ...normalizedAdj.slice(0, 3).map(
        (a) =>
          `${a.factor} (${a.direction === "increase" ? "+" : "−"}${a.amount_cad.toLocaleString("en-CA")} CAD)`
      ),
      ...factorsInc.slice(0, 2).map((f) => f.factor),
    ].filter(Boolean);
    if (keyDrivers.length) notes.push("Seeded key_value_drivers from adjustments");
  }

  let methodology = result.methodology?.trim() || "";
  if (!methodology) {
    methodology = `Baseline comps/market value of approximately ${base.toLocaleString("en-CA")} CAD, adjusted for subject features (net ${Math.round(net).toLocaleString("en-CA")} CAD), then a ${clampedConfidence}-confidence band around the mid-point.`;
    notes.push("Generated default methodology");
  }

  const next: ValuationParsed = {
    ...result,
    comps_base_cad: base,
    estimated_value_low: low,
    estimated_value_mid: mid,
    estimated_value_high: high,
    recommended_list_price_cad: listPrice,
    expected_selling_price_cad: expected,
    confidence: clampedConfidence,
    feature_adjustments: normalizedAdj,
    factors_increasing_value: factorsInc,
    factors_decreasing_value: factorsDec,
    key_value_drivers: keyDrivers,
    methodology,
    limitations,
  };

  const meta: ReconcileMeta = {
    comps_base_cad: base,
    net_adjustment_cad: Math.round(net),
    band_pct: bandPct,
    band_cad: Math.round(bandCad),
    capped_adjustments: normalizedAdj.length,
    dropped_double_count: dropped,
    mid_source: useRecomputed ? "recomputed" : "model_kept",
    data_quality: quality,
    confidence_clamped: confidenceClamped,
    notes,
  };

  return { result: next, meta };
}
