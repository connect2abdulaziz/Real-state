import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, VALUATION_MODEL } from "@/lib/openai/client";
import {
  VALUATION_SYSTEM_PROMPT,
  PROMPT_VERSION,
  buildValuationUserPrompt,
} from "@/lib/valuation/prompt";
import { VALUATION_JSON_SCHEMA, ValuationResultSchema } from "@/lib/valuation/schema";
import { fetchMarketContext } from "@/lib/valuation/fetch-market-context";
import { fetchCompsContext } from "@/lib/valuation/fetch-comps-context";
import { reconcileValuation } from "@/lib/valuation/reconcile-valuation";
import { assessDataQuality } from "@/lib/valuation/data-quality";
import { PropertyRecord, ValuationRecord } from "@/lib/types";

interface RunValuationArgs {
  propertyId: string;
  /** Optional supporting market/location context. If omitted, web search may fill it. */
  marketContext?: string;
  /** Client chat locale — narrative valuation fields must match. */
  locale?: "en" | "fr";
  /** Skip automatic web market lookup (default false). */
  skipWebMarket?: boolean;
  /** Skip RAG comps retrieval (default false). */
  skipRagComps?: boolean;
}

/**
 * Executes the AI valuation workflow:
 * 1) RAG sold comps from KB (primary evidence when available)
 * 2) Optional web market brief (secondary neighbourhood averages)
 * 3) Structured valuation JSON with feature adjustments
 */
export async function runValuation({
  propertyId,
  marketContext,
  locale = "en",
  skipWebMarket = false,
  skipRagComps = false,
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

  let compsText = "";
  let compsTypeMatched = false;
  let compsMeta: {
    via: string;
    query?: string;
    chunkCount: number;
    typeMatched?: boolean;
    sources?: Array<{
      title: string;
      region: string | null;
      status: string | null;
      property_type: string | null;
      source_file: string;
    }>;
  } = { via: skipRagComps ? "skipped" : "none", chunkCount: 0 };

  if (!skipRagComps) {
    const comps = await fetchCompsContext(typedProperty);
    compsTypeMatched = comps.typeMatched;
    compsMeta = {
      via: comps.via,
      query: comps.query,
      chunkCount: comps.chunkCount,
      typeMatched: comps.typeMatched,
      sources: comps.sources,
    };
    if (comps.via === "rag" && comps.text) {
      compsText = comps.text;
      console.info(
        `[valuation] comps via rag (${comps.chunkCount} chunks, typeMatched=${comps.typeMatched})`
      );
    } else {
      console.warn(`[valuation] comps ${comps.via}; continuing without KB comps`);
    }
  }

  let resolvedMarket = marketContext?.trim() || "";
  let marketHasGeoPeriod: boolean | undefined = marketContext?.trim()
    ? true
    : undefined;
  let marketMeta: {
    via: string;
    query?: string;
    sources?: string[];
    hasGeoPeriod?: boolean;
  } = { via: marketContext?.trim() ? "provided" : "none" };

  if (!resolvedMarket && !skipWebMarket) {
    const market = await fetchMarketContext(typedProperty);
    marketHasGeoPeriod = market.hasGeoPeriod;
    marketMeta = {
      via: market.via,
      query: market.query,
      sources: market.sources,
      hasGeoPeriod: market.hasGeoPeriod,
    };
    if (market.via === "web_search" && market.text) {
      resolvedMarket = market.text;
      console.info(
        `[valuation] market context via web_search (geoPeriod=${market.hasGeoPeriod})`
      );
    } else {
      console.warn(`[valuation] market context ${market.via}; continuing without web data`);
    }
  }

  const dataQuality = assessDataQuality({
    compsVia: compsMeta.via,
    compsChunkCount: compsMeta.chunkCount,
    compsTypeMatched,
    marketVia: marketMeta.via,
    marketHasGeoPeriod,
  });
  console.info(`[valuation] data quality: ${dataQuality}`);

  const dataQualityNote =
    dataQuality === "thin"
      ? "Evidence is THIN (few/no type-matched sold comps and/or incomplete market geo+period). Set confidence to low, widen the range, and state uncertainty — do not invent figures."
      : dataQuality === "adequate"
        ? "Evidence is ADEQUATE but not rich. Prefer type-matched comps; require place+period on any market average you cite; keep confidence at most medium."
        : "Evidence looks STRONG (type-matched comps + market brief with place/period). Still do not invent sold addresses.";

  try {
    const openai = createOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: VALUATION_MODEL,
      messages: [
        { role: "system", content: VALUATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildValuationUserPrompt(typedProperty, {
            marketContext: resolvedMarket || undefined,
            compsContext: compsText || undefined,
            locale,
            dataQualityNote,
          }),
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
    const modelResult = ValuationResultSchema.parse(parsedJson);
    const { result, meta: reconcileMeta } = reconcileValuation(modelResult, {
      dataQuality,
    });

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
          ...result,
          _model_raw: parsedJson,
          _reconcile: reconcileMeta,
          _data_quality: dataQuality,
          _comps_lookup: compsMeta,
          _comps_context_preview: compsText ? compsText.slice(0, 3000) : null,
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
