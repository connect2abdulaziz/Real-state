import type { ReactNode } from "react";

type Accent = "electric" | "warm" | "cyan" | "ok";

const ACCENT: Record<Accent, string> = {
  electric: "#b7ac7f",
  warm: "#d7a866",
  cyan: "#2c9cc5",
  ok: "#6ee7b7",
};

export function DonutChart({
  segments,
  size = 160,
  thickness = 18,
  centerLabel,
  centerValue,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string | number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => {
            const len = (seg.value / total) * c;
            const el = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
                className="transition-all duration-700"
              />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          {centerValue != null && (
            <p className="text-[1.35rem] font-semibold tabular-nums text-foreground leading-none">
              {centerValue}
            </p>
          )}
          {centerLabel && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-foreground-subtle">
              {centerLabel}
            </p>
          )}
        </div>
      </div>
      <ul className="space-y-2 w-full min-w-0">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex items-center gap-2 text-foreground-muted min-w-0">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: seg.color }}
              />
              <span className="truncate">{seg.label}</span>
            </span>
            <span className="tabular-nums text-foreground font-medium shrink-0">
              {seg.value}
              <span className="text-foreground-subtle font-normal ml-1.5 text-[11px]">
                {Math.round((seg.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BarChart({
  bars,
  height = 160,
}: {
  bars: { label: string; value: number; color?: string }[];
  height?: number;
}) {
  const max = Math.max(...bars.map((b) => b.value), 1);
  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end gap-2 h-[calc(100%-1.5rem)]">
        {bars.map((b) => {
          const pct = (b.value / max) * 100;
          return (
            <div key={b.label} className="flex-1 flex flex-col justify-end items-center h-full min-w-0 group">
              <span className="mb-1 text-[11px] tabular-nums text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity">
                {b.value}
              </span>
              <div
                className="w-full max-w-10 rounded-t-sm transition-all duration-700 ease-out"
                style={{
                  height: `${Math.max(pct, b.value > 0 ? 4 : 0)}%`,
                  background: `linear-gradient(180deg, ${b.color || ACCENT.electric} 0%, ${b.color || ACCENT.electric}88 100%)`,
                }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 mt-2">
        {bars.map((b) => (
          <p
            key={b.label}
            className="flex-1 text-center text-[10px] text-foreground-subtle truncate"
          >
            {b.label}
          </p>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({
  rows,
}: {
  rows: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-foreground-muted">{r.label}</span>
            <span className="tabular-nums text-foreground font-medium">{r.value}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(r.value / max) * 100}%`,
                background: r.color || ACCENT.electric,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SparkArea({
  points,
  color = ACCENT.cyan,
  height = 72,
}: {
  points: number[];
  color?: string;
  height?: number;
}) {
  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[12px] text-foreground-subtle"
        style={{ height }}
      >
        No activity yet
      </div>
    );
  }
  const max = Math.max(...points, 1);
  const w = 100;
  const h = 40;
  const coords = points
    .map((v, i) => {
      const x = points.length === 1 ? w / 2 : (i / (points.length - 1)) * w;
      const y = h - (v / max) * (h - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");
  const area = `0,${h} ${coords} ${w},${h}`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height }}
    >
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill="url(#sparkFill)" />
      <polyline
        points={coords}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FunnelSteps({
  steps,
}: {
  steps: { label: string; value: number; hint?: string }[];
}) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-2.5">
      {steps.map((s, i) => {
        const width = 55 + (s.value / max) * 45;
        return (
          <div key={s.label} className="flex items-center gap-3">
            <span className="w-5 text-[11px] text-foreground-subtle tabular-nums">
              {i + 1}
            </span>
            <div
              className="h-9 rounded-md flex items-center px-3 transition-all duration-700"
              style={{
                width: `${width}%`,
                background:
                  i === 0
                    ? "rgba(183,172,127,0.18)"
                    : i === steps.length - 1
                      ? "rgba(110,231,183,0.14)"
                      : "rgba(44,156,197,0.14)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <span className="text-[12px] text-foreground truncate">{s.label}</span>
            </div>
            <div className="ml-auto text-right shrink-0">
              <p className="text-[13px] font-medium tabular-nums text-foreground">
                {s.value}
              </p>
              {s.hint && (
                <p className="text-[10px] text-foreground-subtle">{s.hint}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export { ACCENT };
