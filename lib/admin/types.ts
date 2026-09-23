import type {
  ConsultationChannel,
  ConsultationStatus,
  ConversationStatus,
  ValuationConfidence,
  ValuationStatus,
} from "@/lib/types";

export type LeadPipelineStatus =
  | "in_progress"
  | "valued"
  | "consult_requested"
  | "scheduled"
  | "failed"
  | "abandoned";

export interface AdminAnalytics {
  conversationsTotal: number;
  conversationsCompleted: number;
  conversationsInProgress: number;
  conversationsAbandoned: number;
  valuationsCompleted: number;
  valuationsFailed: number;
  reportsGenerated: number;
  consultationsRequested: number;
  consultationsDeclined: number;
  consultationsScheduled: number;
  consultationsCompleted: number;
  fubSynced: number;
  fubFailed: number;
  emailsSent: number;
  emailsFailed: number;
}

export interface AdminLeadRow {
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  conversationStatus: ConversationStatus;
  homeownerId: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  fubPersonId: string | null;
  fubSyncedAt: string | null;
  propertyId: string | null;
  address: string | null;
  propertyType: string | null;
  valuationId: string | null;
  valuationStatus: ValuationStatus | null;
  valueLow: number | null;
  valueHigh: number | null;
  confidence: ValuationConfidence | null;
  reportGeneratedAt: string | null;
  consultationId: string | null;
  consultationStatus: ConsultationStatus | null;
  wantsReview: boolean | null;
  channel: ConsultationChannel | null;
  preferredTime: string | null;
  motivation: string | null;
  pipeline: LeadPipelineStatus;
}

export interface AdminIntegrationEvent {
  id: string;
  kind: string;
  trigger: string;
  status: string;
  provider: string | null;
  external_id: string | null;
  error_message: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  conversation_id: string | null;
  homeowner_id: string | null;
}
