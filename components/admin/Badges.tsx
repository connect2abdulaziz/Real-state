import type { ReactNode } from "react";
import type { LeadPipelineStatus } from "@/lib/admin/types";
import { PIPELINE_LABEL } from "@/lib/admin/pipeline";

const PIPELINE_CLASS: Record<LeadPipelineStatus, string> = {
  in_progress: "bg-electric-soft/15 text-electric-soft border-electric-soft/30",
  valued: "bg-electric/15 text-electric border-electric/30",
  consult_requested: "bg-warm/15 text-warm border-warm/30",
  scheduled: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/15 text-red-300 border-red-500/30",
  abandoned: "bg-white/5 text-foreground-subtle border-white/10",
};

export function PipelineBadge({ status }: { status: LeadPipelineStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border ${PIPELINE_CLASS[status]}`}
    >
      {PIPELINE_LABEL[status]}
    </span>
  );
}

export function SoftBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "ok" | "warn" | "bad" | "info";
}) {
  const tones = {
    neutral: "bg-white/5 text-foreground-muted border-white/10",
    ok: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warn: "bg-warm/15 text-warm border-warm/30",
    bad: "bg-red-500/15 text-red-300 border-red-500/30",
    info: "bg-electric-soft/15 text-electric-soft border-electric-soft/30",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium border ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
