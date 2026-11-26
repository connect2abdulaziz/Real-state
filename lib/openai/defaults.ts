/**
 * Code defaults when Vercel/env keys are missing.
 * Env vars always win when set; these keep prod behavior current without
 * requiring every new key to be added on Vercel.
 */

/** Chat + Responses web_search model */
export const DEFAULT_CHAT_MODEL = "gpt-6.1-terra";

/** Market brief / property-lookup web_search model */
export const DEFAULT_MARKET_MODEL = "gpt-6.1-terra";

/** Valuation structured JSON (must support json_schema) */
export const DEFAULT_VALUATION_MODEL = "gpt-4o";

/** open = full web; preferred = portal-biased */
export const DEFAULT_CHAT_SEARCH_MODE: "open" | "preferred" = "open";

export function envFlagDefaultTrue(value: string | undefined): boolean {
  if (value === "false") return false;
  if (value === "true") return true;
  return true;
}

export function resolveChatModelFromEnv(): string {
  return (
    process.env.OPENAI_CHAT_MODEL ||
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    DEFAULT_CHAT_MODEL
  );
}

export function resolveMarketModelFromEnv(): string {
  return (
    process.env.OPENAI_MARKET_MODEL ||
    process.env.OPENAI_CHAT_MODEL ||
    process.env.OPENAI_VALUATION_MODEL ||
    DEFAULT_MARKET_MODEL
  );
}

export function resolveValuationModelFromEnv(): string {
  return process.env.OPENAI_VALUATION_MODEL || DEFAULT_VALUATION_MODEL;
}

export function resolveChatSearchModeFromEnv(): "open" | "preferred" {
  const raw = (process.env.CHAT_SEARCH_MODE || DEFAULT_CHAT_SEARCH_MODE)
    .toLowerCase()
    .trim();
  return raw === "preferred" ? "preferred" : "open";
}
