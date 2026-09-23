import type { LeadPipelineStatus } from "./types";
import type {
  ConsultationStatus,
  ConversationStatus,
  ValuationStatus,
} from "@/lib/types";

export function derivePipeline(args: {
  conversationStatus: ConversationStatus;
  valuationStatus: ValuationStatus | null;
  consultationStatus: ConsultationStatus | null;
}): LeadPipelineStatus {
  if (args.conversationStatus === "abandoned") return "abandoned";
  if (args.consultationStatus === "scheduled" || args.consultationStatus === "completed") {
    return "scheduled";
  }
  if (args.consultationStatus === "requested") return "consult_requested";
  if (args.valuationStatus === "failed") return "failed";
  if (args.valuationStatus === "completed") return "valued";
  return "in_progress";
}

export const PIPELINE_LABEL: Record<LeadPipelineStatus, string> = {
  in_progress: "In progress",
  valued: "Valued",
  consult_requested: "Consult requested",
  scheduled: "Scheduled",
  failed: "Valuation failed",
  abandoned: "Abandoned",
};
