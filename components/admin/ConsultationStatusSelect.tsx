"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ConsultationStatus } from "@/lib/types";

const OPTIONS: ConsultationStatus[] = [
  "requested",
  "scheduled",
  "completed",
  "declined",
];

export function ConsultationStatusSelect({
  id,
  status,
}: {
  id: string;
  status: ConsultationStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: ConsultationStatus) {
    setBusy(true);
    setError(null);
    const prev = value;
    setValue(next);
    try {
      const res = await fetch(`/api/admin/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Update failed");
      router.refresh();
    } catch (err) {
      setValue(prev);
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as ConsultationStatus)}
        className="rounded-md border border-white/10 bg-surface-soft px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-electric/40 disabled:opacity-50"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-warm">{error}</p>}
    </div>
  );
}
