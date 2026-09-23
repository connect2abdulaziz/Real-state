"use client";

import { useRouter } from "next/navigation";

const STATUSES = [
  { value: "requested", label: "Requested" },
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "declined", label: "Declined" },
  { value: "all", label: "All" },
];

export function ConsultationsFilters({ status }: { status: string }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap gap-2">
      {STATUSES.map((s) => {
        const active = status === s.value;
        return (
          <button
            key={s.value}
            type="button"
            onClick={() =>
              router.push(
                s.value === "requested"
                  ? "/admin/consultations"
                  : `/admin/consultations?status=${s.value}`
              )
            }
            className={`px-3 py-1.5 rounded-full text-[12px] border transition-colors ${
              active
                ? "border-electric/40 bg-electric/15 text-electric"
                : "border-white/10 text-foreground-muted hover:border-white/20"
            }`}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
