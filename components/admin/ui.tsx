import type { ReactNode } from "react";

export function StatTile({
  label,
  value,
  hint,
  accent,
  spark,
}: {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "electric" | "warm" | "cyan" | "ok";
  spark?: ReactNode;
}) {
  const accentClass =
    accent === "warm"
      ? "text-warm"
      : accent === "cyan"
        ? "text-electric-soft"
        : accent === "ok"
          ? "text-emerald-300"
          : "text-electric";

  return (
    <div className="relative rounded-md border border-white/8 bg-gradient-to-b from-surface-soft/80 to-surface/40 px-4 py-4 min-w-0 overflow-hidden transition-colors hover:border-white/12">
      <p className="text-[11px] uppercase tracking-[0.1em] text-foreground-subtle">
        {label}
      </p>
      <p
        className={`mt-2 text-[1.85rem] font-semibold tabular-nums leading-none tracking-tight ${accentClass}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-2 text-[12px] text-foreground-muted leading-snug">{hint}</p>
      )}
      {spark && <div className="mt-3 -mx-1 opacity-90">{spark}</div>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  bodyClassName = "p-0",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <section className="rounded-md border border-white/8 bg-surface/40 backdrop-blur-sm overflow-hidden shadow-[0_1px_0_rgba(255,255,255,0.03)_inset]">
      <header className="flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-white/8">
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium text-foreground tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-foreground-muted">{subtitle}</p>
          )}
        </div>
        {action}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-foreground-subtle">
          {eyebrow}
        </p>
        <h1 className="mt-1 font-serif text-[clamp(1.65rem,3vw,2.15rem)] text-foreground tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 text-[14px] text-foreground-muted max-w-xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[13px] text-foreground-muted">{message}</p>
    </div>
  );
}
