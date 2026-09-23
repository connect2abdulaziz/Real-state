import OpenAI from "openai";

/**
 * Server-only OpenAI client. Only import from server code (app/api/**,
 * lib/valuation/**) — never from a "use client" component.
 */
export function createOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey });
}

export const VALUATION_MODEL = process.env.OPENAI_VALUATION_MODEL || "gpt-4o";
