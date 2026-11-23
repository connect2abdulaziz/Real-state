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

export const FeatureAdjustmentSchema = z.object({
  factor: z.string().min(1),
  direction: z.enum(["increase", "decrease"]),
  amount_cad: z.number(),
  percent: z.number(),
  basis: z.string().min(1),
});

export const ValuationResultSchema = z
  .object({
    comps_base_cad: z.number().positive(),
    estimated_value_low: z.number().positive(),
    estimated_value_mid: z.number().positive(),
    estimated_value_high: z.number().positive(),
    recommended_list_price_cad: z.number().positive(),
    expected_selling_price_cad: z.number().positive(),
    confidence: z.enum(["low", "medium", "high"]),
    feature_adjustments: z.array(FeatureAdjustmentSchema),
    factors_increasing_value: z.array(ValuationFactorSchema),
    factors_decreasing_value: z.array(ValuationFactorSchema),
    key_value_drivers: z.array(z.string().min(1)),
    property_strengths: z.array(z.string().min(1)),
    potential_considerations: z.array(z.string().min(1)),
    market_observations: z.array(z.string().min(1)),
    methodology: z.string().min(1),
    explanation: z.string().min(1),
    limitations: z.string().min(1),
  })
  .refine((v) => v.estimated_value_high >= v.estimated_value_low, {
    message: "estimated_value_high must be >= estimated_value_low",
    path: ["estimated_value_high"],
  })
  .refine(
    (v) =>
      v.estimated_value_mid >= v.estimated_value_low &&
      v.estimated_value_mid <= v.estimated_value_high,
    {
      message: "estimated_value_mid must be between low and high",
      path: ["estimated_value_mid"],
    }
  );

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
      comps_base_cad: {
        type: "number",
        description:
          "Pre-adjustment comps (or market) baseline in CAD. Mid should equal this plus signed feature_adjustments.",
      },
      estimated_value_low: {
        type: "number",
        description:
          "Low end of the preliminary estimated value range, in CAD.",
      },
      estimated_value_mid: {
        type: "number",
        description:
          "Mid-point in CAD = comps_base_cad ± sum of feature_adjustments (before server reconciliation).",
      },
      estimated_value_high: {
        type: "number",
        description:
          "High end of the preliminary estimated value range, in CAD.",
      },
      recommended_list_price_cad: {
        type: "number",
        description:
          "Suggested asking / list price in CAD (typically at or slightly above mid, within the high end). Always provide a number.",
      },
      expected_selling_price_cad: {
        type: "number",
        description:
          "Most likely expected selling price in CAD (usually near mid, inside low–high).",
      },
      confidence: {
        type: "string",
        enum: ["low", "medium", "high"],
        description:
          "How confident the estimate is given comps quality and property detail. Low when comps are thin or missing. Drives range width.",
      },
      feature_adjustments: {
        type: "array",
        description:
          "Subject-vs-comps adjustments only. Separate above-ground living area from finished basement. Never double-count the same feature. amount_cad is absolute CAD (positive); direction sets sign. Cap each adj ~8% of base.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            factor: {
              type: "string",
              description:
                "One of: Above-ground living area, Finished basement, Year built, Renovations, Parking, Condition, Lot size, Property type — not bedrooms if basement already covers finished space.",
            },
            direction: {
              type: "string",
              enum: ["increase", "decrease"],
            },
            amount_cad: {
              type: "number",
              description:
                "Absolute CAD adjustment vs comps_base_cad (positive number; direction field sets sign).",
            },
            percent: {
              type: "number",
              description:
                "Percent of comps_base_cad if used; otherwise 0.",
            },
            basis: {
              type: "string",
              description:
                "Short rationale tying the adjustment to subject vs comps evidence.",
            },
          },
          required: [
            "factor",
            "direction",
            "amount_cad",
            "percent",
            "basis",
          ],
        },
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
      key_value_drivers: {
        type: "array",
        items: { type: "string" },
        description:
          "3–6 short bullets: the main drivers of this estimate (size, condition, comps, location, etc.).",
      },
      market_observations: {
        type: "array",
        items: { type: "string" },
        description:
          "Any general market/location observations used, based only on what was supplied — empty array if none were available.",
      },
      methodology: {
        type: "string",
        description:
          "Short plain-language methodology: comps base (if any), adjustments, market context role, and how low/mid/high were set. 2–4 sentences.",
      },
      explanation: {
        type: "string",
        description: "Plain-language explanation of how the range was reached.",
      },
      limitations: {
        type: "string",
        description:
          "Honest statement of this estimate's limitations (e.g. thin comps, no inspection, self-reported condition).",
      },
    },
    required: [
      "comps_base_cad",
      "estimated_value_low",
      "estimated_value_mid",
      "estimated_value_high",
      "recommended_list_price_cad",
      "expected_selling_price_cad",
      "confidence",
      "feature_adjustments",
      "factors_increasing_value",
      "factors_decreasing_value",
      "key_value_drivers",
      "property_strengths",
      "potential_considerations",
      "market_observations",
      "methodology",
      "explanation",
      "limitations",
    ],
  },
} as const;
