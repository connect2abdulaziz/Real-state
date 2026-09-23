import {
  PropertyRecord,
  ValuationFactor,
  ValuationRecord,
} from "@/lib/types";

export interface ReportHomeowner {
  name: string | null;
  email: string | null;
  phone: string | null;
}

export interface ReportData {
  valuation: ValuationRecord;
  property: PropertyRecord;
  homeowner: ReportHomeowner;
  generatedAt: string;
}

export function formatCad(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return Number(n).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function formatFactorList(factors: ValuationFactor[]): string[] {
  return (factors ?? []).map((f) => `${f.factor}: ${f.explanation}`);
}

export const REPORT_BRAND = {
  name: "Estate Valora",
  tagline: "Property Insight Montreal",
  brokerName: "Ashkan Shamloo",
  brokerTitle: "Licensed Real Estate Broker",
  email: "hello@estatevalora.com",
  nextSteps: [
    "Review this preliminary range alongside your goals and timeline.",
    "Request a personal review with Ashkan if you want a professional opinion.",
    "Book a phone or video consultation when you are ready to go deeper.",
  ],
  disclaimer:
    "This Estate Valora report is an AI-assisted preliminary estimate based on information you provided and any supporting context available to the system at the time of assessment. It is not a certified appraisal, not a guaranteed selling price, and not a formal market valuation. The result is subject to personal review by Ashkan Shamloo, Licensed Real Estate Broker. MLS data and comprehensive sold-property comparable analysis are not used in Phase 1.",
} as const;
