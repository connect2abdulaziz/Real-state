"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

const PIPELINES = [
  { value: "all", label: "All pipelines" },
  { value: "in_progress", label: "In progress" },
  { value: "valued", label: "Valued" },
  { value: "consult_requested", label: "Consult requested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "failed", label: "Failed" },
  { value: "abandoned", label: "Abandoned" },
];

const LEAD_TYPES = [
  { value: "all", label: "All leads" },
  { value: "seller", label: "Sellers" },
  { value: "buyer", label: "Buyers" },
];

export function LeadsFilters({
  q,
  pipeline,
  leadType,
}: {
  q: string;
  pipeline: string;
  leadType: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  function apply(nextQ: string, nextPipeline: string, nextLeadType: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPipeline && nextPipeline !== "all") {
      params.set("pipeline", nextPipeline);
    }
    if (nextLeadType && nextLeadType !== "all") {
      params.set("type", nextLeadType);
    }
    const qs = params.toString();
    router.push(qs ? `/admin/leads?${qs}` : "/admin/leads");
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          apply(query, pipeline, leadType);
        }}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, address…"
          className="w-full rounded-md border border-white/10 bg-surface/60 pl-9 pr-3 py-2.5 text-[13px] outline-none focus:border-electric/40 transition-colors"
        />
      </form>
      <select
        value={leadType}
        onChange={(e) => apply(query, pipeline, e.target.value)}
        className="rounded-md border border-white/10 bg-surface/60 px-3 py-2.5 text-[13px] outline-none focus:border-electric/40 sm:w-36 transition-colors"
      >
        {LEAD_TYPES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
      <select
        value={pipeline}
        onChange={(e) => apply(query, e.target.value, leadType)}
        className="rounded-md border border-white/10 bg-surface/60 px-3 py-2.5 text-[13px] outline-none focus:border-electric/40 sm:w-48 transition-colors"
      >
        {PIPELINES.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}
