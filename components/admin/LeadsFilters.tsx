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

export function LeadsFilters({
  q,
  pipeline,
}: {
  q: string;
  pipeline: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);

  function apply(nextQ: string, nextPipeline: string) {
    const params = new URLSearchParams();
    if (nextQ.trim()) params.set("q", nextQ.trim());
    if (nextPipeline && nextPipeline !== "all") {
      params.set("pipeline", nextPipeline);
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
          apply(query, pipeline);
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
        value={pipeline}
        onChange={(e) => apply(query, e.target.value)}
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
