export type StepType = "text" | "number" | "select" | "yesno" | "multiselect";

export type ConversationSection =
  | "Property"
  | "Characteristics"
  | "Condition"
  | "Details"
  | "Motivation"
  | "Contact";

export interface ConversationStep {
  id: string;
  section: ConversationSection;
  type: StepType;
  ask: string;
  explain?: string;
  optional?: boolean;
  placeholder?: string;
  options?: string[];
  /** Determines whether this step should be shown, based on prior answers. */
  condition?: (answers: Answers) => boolean;
}

/** Free-form map of stepId -> the homeowner's raw answer. */
export type Answers = Record<string, string>;

export type MessageFrom = "ai" | "ai-note" | "user";

export interface TranscriptMessage {
  from: MessageFrom;
  text: string;
  stepId?: string;
  at: string; // ISO timestamp
}

export type ConversationStatus = "in_progress" | "completed" | "abandoned";

export interface ConversationRecord {
  id: string;
  homeowner_id: string | null;
  status: ConversationStatus;
  transcript: TranscriptMessage[];
  answers: Answers;
  created_at: string;
  updated_at: string;
}

/**
 * Extra structured fields collected during the EstateValora conversation
 * that don't map 1:1 to the core valuation columns (lead qual, condo/
 * income specifics, ownership, etc.).
 */
export type PropertyDetails = Record<string, string | number | boolean | null>;

export interface PropertyRecord {
  id: string;
  homeowner_id: string | null;
  conversation_id: string;
  address: string | null;
  property_type: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  living_area_sqft: number | null;
  lot_size: string | null;
  year_built: number | null;
  basement_info: string | null;
  parking_info: string | null;
  condition: string | null;
  renovations: string | null;
  notable_features: string | null;
  additional_notes: string | null;
  ownership: string | null;
  details: PropertyDetails;
  created_at: string;
}

// ---- Section 3: AI Property Valuation ----

export type ValuationConfidence = "low" | "medium" | "high";
export type ValuationStatus = "pending" | "completed" | "failed";

export interface ValuationFactor {
  factor: string;
  explanation: string;
}

/**
 * The structured shape returned by the OpenAI valuation call. This is the
 * "expected output structure" the app enforces (SOW 3/4.2: "The application
 * will control the required inputs and expected output structure rather
 * than allowing the model to return an unrestricted response").
 */
export interface ValuationResult {
  estimated_value_low: number;
  estimated_value_high: number;
  confidence: ValuationConfidence;
  factors_increasing_value: ValuationFactor[];
  factors_decreasing_value: ValuationFactor[];
  property_strengths: string[];
  potential_considerations: string[];
  market_observations: string[];
  explanation: string;
  limitations: string;
}

export interface ValuationRecord extends ValuationResult {
  id: string;
  property_id: string;
  conversation_id: string;
  homeowner_id: string | null;
  status: ValuationStatus;
  model: string | null;
  prompt_version: string | null;
  error_message: string | null;
  report_generated_at?: string | null;
  created_at: string;
}

export type ConsultationChannel = "phone" | "video";
export type ConsultationStatus =
  | "requested"
  | "declined"
  | "scheduled"
  | "completed";

export interface ConsultationRecord {
  id: string;
  conversation_id: string;
  property_id: string | null;
  homeowner_id: string | null;
  valuation_id: string | null;
  wants_review: boolean;
  channel: ConsultationChannel | null;
  preferred_time: string | null;
  status: ConsultationStatus;
  created_at: string;
}
