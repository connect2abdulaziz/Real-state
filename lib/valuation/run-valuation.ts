import { createAdminClient } from "@/lib/supabase/admin";
import { createOpenAIClient, VALUATION_MODEL } from "@/lib/openai/client";
import {
  VALUATION_SYSTEM_PROMPT,
  PROMPT_VERSION,
  buildValuationUserPrompt,
} from "@/lib/valuation/prompt";
import { VALUATION_JSON_SCHEMA, ValuationResultSchema } from "@/lib/valuation/schema";
import { PropertyRecord, ValuationRecord } from "@/lib/types";

interface RunValuationArgs {
  propertyId: string;
  /** Optional supporting market/location context, when the platform has any (see prompt.ts). */
  marketContext?: string;
}

/**
 * Executes the Phase 1 AI valuation workflow (SOW 3 / SOW 12 steps 4-7):
 * loads the homeowner's structured property record, sends it to OpenAI
 * with the configured valuation instructions and a strict output schema,
 * validates what comes back, and stores it. Used both:
 *  - automatically, right after a conversation completes
 *    (app/api/conversations/[id]/route.ts), and
 *  - on demand via POST /api/valuations, e.g. for a manual re-run from
 *    the future admin dashboard.
 */
export async function runValuation({
  propertyId,
  marketContext,
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

  try {
    const openai = createOpenAIClient();

    const completion = await openai.chat.completions.create({
      model: VALUATION_MODEL,
      messages: [
        { role: "system", content: VALUATION_SYSTEM_PROMPT },
        {
          role: "user",
          content: buildValuationUserPrompt(typedProperty, marketContext),
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
        raw_model_output: parsedJson,
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

    // Even the failure record couldn't be written — surface the original error.
    throw err;
  }
}
