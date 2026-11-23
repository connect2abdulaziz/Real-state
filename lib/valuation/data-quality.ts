import type { PropertyRecord } from "@/lib/types";
import { mapEstateTypeToCompFilter } from "@/lib/rag/meta";

export type DataQuality = "strong" | "adequate" | "thin";

export type DataQualityInput = {
  compsVia: string;
  compsChunkCount: number;
  compsTypeMatched: boolean;
  marketVia: string;
  marketHasGeoPeriod?: boolean;
};

/** Preferred Quebec / Montreal market portals for valuation briefs. */
export const VALUATION_PREFERRED_SOURCES = [
  "HonestDoor",
  "Centris",
  "Equipe AJ (equipeaj.ca)",
  "OpenHouse QC (openhouseqc.com)",
  "HousingPortal (housingportal.ca)",
  "realtor.ca",
  "APCIQ / QAREB",
  "JLR",
] as const;

/**
 * Human label for market queries — keep condo / house / plex distinct.
 */
export function marketTypeLabel(
  propertyType: string | null | undefined
): string {
  if (!propertyType) return "single-family home";
  const lower = propertyType.toLowerCase();
  if (/condo|appartement|apartment/.test(lower)) return "condo / apartment";
  if (/duplex/.test(lower)) return "duplex";
  if (/triplex/.test(lower)) return "triplex";
  if (/fourplex|plex|multi|income/.test(lower)) {
    return "plex / multi-unit income property";
  }
  if (/townhouse|row/.test(lower)) return "townhouse";
  if (/single|detached|maison|unifamiliale|bungalow|cottage|house/.test(lower)) {
    return "single-family home";
  }
  return propertyType;
}

export function subjectCompTypeFilter(
  property: PropertyRecord
): "condo" | "single_family" | "other" | undefined {
  return mapEstateTypeToCompFilter(property.property_type);
}

/**
 * Heuristic: market brief mentions a place + a time period.
 */
export function marketBriefHasGeoAndPeriod(text: string): boolean {
  if (!text?.trim()) return false;
  const hasPeriod =
    /\b(20\d{2}|q[1-4]\s*20\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|ytd|year[- ]to[- ]date|last\s+\d+\s+months?|derniers?\s+\d+\s+mois)\b/i.test(
      text
    );
  const hasGeo =
    /\b(montr[eé]al|laval|longueuil|blainville|quebec|québec|saint[- ]?[a-z]|rive[- ]?sud|laurentides|borough|neighbourhood|neighborhood|quartier|arrondissement|postal|H\d[A-Z]|J\d[A-Z]|city|ville)\b/i.test(
      text
    );
  return hasPeriod && hasGeo;
}

/**
 * Overall evidence quality for confidence / range width.
 */
export function assessDataQuality(input: DataQualityInput): DataQuality {
  const compsOk =
    input.compsVia === "rag" &&
    input.compsChunkCount >= 3 &&
    input.compsTypeMatched;
  const compsPartial =
    input.compsVia === "rag" &&
    input.compsChunkCount >= 1 &&
    input.compsTypeMatched;
  const marketOk =
    input.marketVia === "web_search" || input.marketVia === "provided";
  const marketStrong = marketOk && input.marketHasGeoPeriod !== false;

  if (compsOk && marketStrong) return "strong";
  if (compsPartial || (marketStrong && input.compsChunkCount >= 1)) {
    return "adequate";
  }
  if (compsPartial || marketOk) return "adequate";
  return "thin";
}

/** Confidence ceiling given evidence quality (never upgrade above model). */
export function confidenceCeiling(
  quality: DataQuality
): "low" | "medium" | "high" {
  if (quality === "strong") return "high";
  if (quality === "adequate") return "medium";
  return "low";
}

const RANK = { low: 0, medium: 1, high: 2 } as const;

export function clampConfidence(
  model: "low" | "medium" | "high",
  quality: DataQuality
): "low" | "medium" | "high" {
  const ceiling = confidenceCeiling(quality);
  return RANK[model] <= RANK[ceiling] ? model : ceiling;
}

/** Extra band multiplier when evidence is thin. */
export function bandMultiplierForQuality(quality: DataQuality): number {
  if (quality === "thin") return 1.35;
  if (quality === "adequate") return 1.1;
  return 1;
}
