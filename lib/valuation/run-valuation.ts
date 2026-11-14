import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, VALUATION_MODEL } from "@/lib/openai/client";
import {
  VALUATION_SYSTEM_PROMPT,
  PROMPT_VERSION,
  buildValuationUserPrompt,
} from "@/lib/valuation/prompt";
import { VALUATION_JSON_SCHEMA, ValuationResultSchema } from "@/lib/valuation/schema";
import { fetchMarketContext } from "@/lib/valuation/fetch-market-context";
import { PropertyRecord, ValuationRecord } from "@/lib/types";

interface RunValuationArgs {
  propertyId: string;
  /** Optional supporting market/location context. If omitted, web search may fill it. */
  marketContext?: string;
  /** Client chat locale — narrative valuation fields must match. */
  locale?: "en" | "fr";
  /** Skip automatic web market lookup (default false). */
  skipWebMarket?: boolean;
}

/**
 * Executes the AI valuation workflow:
 * 1) Optional web market brief (OpenAI Responses + web_search) → marketContext
 * 2) Structured valuation JSON from property answers + marketContext
 */
export async function runValuation({
  propertyId,
  marketContext,
  locale = "en",
  skipWebMarket = false,
}: RunValuationArgs): Promise<ValuationRecord> {
  const supabase = createAdminClient();

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .single();

  if (propertyError || !property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  const typedProperty = property as PropertyRecord;

  let resolvedMarket = marketContext?.trim() || "";
  let marketMeta: {
    via: string;
    query?: string;
    sources?: string[];
  } = { via: marketContext?.trim() ? "provided" : "none" };

  if (!resolvedMarket && !skipWebMarket) {
    const market = await fetchMarketContext(typedProperty);
    marketMeta = {
      via: market.via,
      query: market.query,
      sources: market.sources,
    };
    if (market.via === "web_search" && market.text) {
      resolvedMarket = market.text;
      console.info(
        `[valuation] market context via web_search (${market.sources?.length || 0} sources)`
      );
    } else {
      console.warn(`[valuation] market context ${market.via}; continuing without web data`);
    }
  }

  try {
    const openai = createOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: VALUATION_MODEL,
      messages: [
        { role: "system", content: VALUATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildValuationUserPrompt(
            typedProperty,
            resolvedMarket || undefined,
            locale
          ),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: VALUATION_JSON_SCHEMA,
      },
    });

    const rawContent = completion.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("OpenAI returned an empty valuation response");
    }

    const parsedJson = JSON.parse(rawContent);
    const result = ValuationResultSchema.parse(parsedJson);

    const { data: saved, error: saveError } = await supabase
      .from("valuations")
      .insert({
        property_id: typedProperty.id,
        conversation_id: typedProperty.conversation_id,
        homeowner_id: typedProperty.homeowner_id,
        status: "completed",
        estimated_value_low: result.estimated_value_low,
        estimated_value_high: result.estimated_value_high,
        confidence: result.confidence,
        factors_increasing_value: result.factors_increasing_value,
        factors_decreasing_value: result.factors_decreasing_value,
        property_strengths: result.property_strengths,
        potential_considerations: result.potential_considerations,
        market_observations: result.market_observations,
        explanation: result.explanation,
        limitations: result.limitations,
        model: VALUATION_MODEL,
        prompt_version: PROMPT_VERSION,
        raw_model_output: {
          ...parsedJson,
          _market_lookup: marketMeta,
          _market_context_preview: resolvedMarket
            ? resolvedMarket.slice(0, 2000)
            : null,
        },
      })
      .select("*")
      .single();

    if (saveError || !saved) {
      throw new Error(`Failed to store valuation: ${saveError?.message}`);
    }

    return saved as ValuationRecord;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown valuation error";
    console.error(`Valuation failed for property ${propertyId}:`, message);

    const { data: failedRecord } = await supabase
      .from("valuations")
      .insert({
        property_id: typedProperty.id,
        conversation_id: typedProperty.conversation_id,
        homeowner_id: typedProperty.homeowner_id,
        status: "failed",
        model: VALUATION_MODEL,
        prompt_version: PROMPT_VERSION,
        error_message: message,
      })
      .select("*")
      .single();

    if (failedRecord) {
      return failedRecord as ValuationRecord;
    }

    throw err;
  }
}
