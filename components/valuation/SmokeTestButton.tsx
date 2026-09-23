"use client";

import { useState } from "react";
import { FlaskConical, Loader2 } from "lucide-react";

/**
 * Dev-only control: seeds dummy data and fires FUB + Resend without the chat.
 */
export function SmokeTestButton() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/dev/smoke-test", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Smoke test failed");
      }

      const eventSummary = (data.integrationEvents || [])
        .map(
          (e: { kind: string; status: string; error_message?: string }) =>
            `${e.kind}:${e.status}${e.error_message ? ` (${e.error_message})` : ""}`
        )
        .join(" · ");

      setResult(
        `OK — emails to abdulazizkhan6292@gmail.com + brokerage. Range ${data.range}. Events: ${eventSummary || "none yet (check Supabase)"}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Smoke test failed");
    } finally {
      setBusy(false);
    }
  }

  // Only show in local/dev browser (not production builds)
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="mt-6 w-full max-w-md mx-auto text-left">
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full px-4 py-2.5 rounded-full border border-dashed border-electric/50 text-electric text-[12px] font-medium flex items-center justify-center gap-2 hover:bg-electric/10 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FlaskConical size={14} />
        )}
        {busy
          ? "Running FUB + Resend smoke test…"
          : "Dev: smoke test FUB + email (skip chat)"}
      </button>
      <p className="mt-2 text-[11px] text-foreground-subtle text-center">
        Uses dummy Montreal property · email abdulazizkhan6292@gmail.com
      </p>
      {result && (
        <p className="mt-3 text-[12px] text-foreground-muted leading-relaxed break-words rounded-md border border-white/10 bg-surface-soft p-3">
          {result}
        </p>
      )}
      {error && (
        <p className="mt-3 text-[12px] text-warm leading-relaxed break-words">
          {error}
        </p>
      )}
    </div>
  );
}
