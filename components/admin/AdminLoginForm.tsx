"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Loader2 } from "lucide-react";

export function AdminLoginForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
      <div>
        <label
          htmlFor="admin-email"
          className="block text-[12px] uppercase tracking-[0.08em] text-foreground-subtle mb-2"
        >
          Email
        </label>
        <div className="relative">
          <Mail
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
          />
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            autoFocus={!defaultEmail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-surface-soft pl-9 pr-3 py-2.5 text-[14px] text-foreground outline-none focus:border-electric/50"
            placeholder="you@brokerage.com"
            required
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="admin-password"
          className="block text-[12px] uppercase tracking-[0.08em] text-foreground-subtle mb-2"
        >
          Password
        </label>
        <div className="relative">
          <Lock
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-subtle"
          />
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            autoFocus={Boolean(defaultEmail)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-surface-soft pl-9 pr-3 py-2.5 text-[14px] text-foreground outline-none focus:border-electric/50"
            placeholder="Password"
            required
          />
        </div>
      </div>
      {error && <p className="text-[13px] text-warm">{error}</p>}
      <button
        type="submit"
        disabled={busy || !email || !password}
        className="w-full rounded-full bg-white text-background py-2.5 text-[14px] font-medium hover:bg-white/90 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {busy && <Loader2 size={14} className="animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
