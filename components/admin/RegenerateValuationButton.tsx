"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

export function RegenerateValuationButton({
  propertyId,
}: {
  propertyId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notify, setNotify] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRegenerate() {
    if (
      !confirm(
        notify
          ? "Re-run AI valuation and send FUB + email/SMS again?"
          : "Re-run AI valuation? Follow Up Boss will be updated; emails will not be resent."
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/valuations/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, notify }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Regenerate failed");

      const v = data.valuation;
      const range =
        v?.estimated_value_low != null && v?.estimated_value_high != null
          ? `New range saved (${v.status}).`
          : "Valuation saved.";
      setMessage(
        notify
          ? `${range} Notifications queued.`
          : `${range} FUB synced (no emails).`
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="flex items-center gap-2 text-[11px] text-foreground-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={notify}
            disabled={busy}
            onChange={(e) => setNotify(e.target.checked)}
            className="rounded border-white/20"
          />
          Re-notify email / SMS
        </label>
        <button
          type="button"
          onClick={onRegenerate}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-electric/35 bg-electric/10 px-3 py-1.5 text-[12px] font-medium text-electric hover:bg-electric/15 disabled:opacity-50 transition-colors"
        >
          {busy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <RefreshCw size={13} />
          )}
          {busy ? "Regenerating…" : "Regenerate valuation"}
        </button>
      </div>
      {message && (
        <p className="text-[11px] text-emerald-300/90 text-right max-w-xs">
          {message}
        </p>
      )}
      {error && (
        <p className="text-[11px] text-warm text-right max-w-xs">{error}</p>
      )}
    </div>
  );
}
