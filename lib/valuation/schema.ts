import { z } from "zod";

/**
 * Runtime validator for the model's structured output. OpenAI's strict
 * json_schema mode already constrains the shape, but this is a second,
 * independent line of defense — it catches shape drift if the model
 * version or API behavior changes, and adds sanity checks (e.g. low <=
 * high) that JSON Schema alone can't express well.
 */
export const ValuationFactorSchema = z.object({
  factor: z.string().min(1),
  explanation: z.string().min(1),
});

export const ValuationResultSchema = z
  .object({
    estimated_value_low: z.number().positive(),
    estimated_value_high: z.number().positive(),
    confidence: z.enum(["low", "medium", "high"]),
    factors_increasing_value: z.array(ValuationFactorSchema),
    factors_decreasing_value: z.array(ValuationFactorSchema),
    property_strengths: z.array(z.string().min(1)),
    potential_considerations: z.array(z.string().min(1)),
    market_observations: z.array(z.string().min(1)),
    explanation: z.string().min(1),
    limitations: z.string().min(1),
  })
  .refine((v) => v.estimated_value_high >= v.estimated_value_low, {
    message: "estimated_value_high must be >= estimated_value_low",
    path: ["estimated_value_high"],
  });

/**
 * JSON Schema passed to OpenAI's structured-output mode (response_format:
 * json_schema, strict: true). This is what makes the model's output
 * "controlled" rather than freeform (SOW 4.2): every field is required,
 * and no extra fields are allowed.
 */
export const VALUATION_JSON_SCHEMA = {
  name: "property_valuation",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      estimated_value_low: {
        type: "number",
        description: "Low end of the preliminary estimated value range, in USD.",
      },
      estimated_value_high: {
        type: "number",
        description: "High end of the preliminary estimated value range, in USD.",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "How confident the estimate is given the information available. Low confidence when little data was provided or no market context is available.",
      },
      factors_increasing_value: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            factor: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["factor", "explanation"],
        },
      },
      factors_decreasing_value: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            factor: { type: "string" },
            explanation: { type: "string" },
          },
          required: ["factor", "explanation"],
        },
      },
      property_strengths: {
        type: "array",
        items: { type: "string" },
      },
      potential_considerations: {
        type: "array",
        items: { type: "string" },
      },
      market_observations: {
        type: "array",
        items: { type: "string" },
        description:
          "Any general market/location observations used, based only on what was supplied — empty array if none were available.",
      },
      explanation: {
        type: "string",
        description: "Plain-language explanation of how the range was reached.",
      },
      limitations: {
        type: "string",
        description:
          "Honest statement of this estimate's limitations (e.g. no MLS data, no inspection, self-reported condition).",
      },
    },
    required: [
      "estimated_value_low",
      "estimated_value_high",
      "confidence",
      "factors_increasing_value",
      "factors_decreasing_value",
      "property_strengths",
      "potential_considerations",
      "market_observations",
      "explanation",
      "limitations",
    ],
  },
} as const;
