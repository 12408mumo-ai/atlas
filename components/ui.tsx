"use client";

import Link from "next/link";
import { GreekKeyCorner } from "./Ornaments";

/* Flat two-colour UI kit: warm cream (var(--atlas-sand)) surface, charcoal (var(--atlas-charcoal)) structure.
   No gradients anywhere — every fill is a single solid colour. */

export function Panel({
  title,
  hint,
  action,
  children,
  className = "",
  icon,
  tone = "marble",
  glass = true,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "marble" | "wine";
  glass?: boolean;
}) {
  const wine = tone === "wine";
  return (
    <section
      className={`relative min-w-0 p-5 sm:p-6 ${
        wine ? "glass-panel-dark" : glass ? "glass-card" : "glass-tile"
      } ${className}`}
    >
      <GreekKeyCorner className={`pointer-events-none absolute right-2.5 top-2.5 h-6 w-6 ${wine ? "text-marble" : "text-wine"}`} />
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <span className={`mt-0.5 h-5 w-5 shrink-0 ${wine ? "text-marble" : "text-wine"}`}>{icon}</span>}
          <div>
            <h2 className={`font-ui text-[18px] uppercase tracking-[0.2em] ${wine ? "text-marble" : "text-wine"}`}>{title}</h2>
            {hint && (
              <p className={`mt-1.5 font-body text-[20px] italic leading-snug ${wine ? "text-marbleDim" : "text-wine opacity-85"}`}>
                {hint}
              </p>
            )}
          </div>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  tone = "marble",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "marble" | "wine" | "gold";
}) {
  const bg = tone === "wine" ? "glass-tile-dark" : "glass-tile";
  const ink = tone === "wine" ? "text-marble" : "text-wine";
  return (
    <div className={`px-4 py-4 sm:px-5 ${bg}`}>
      <p className={`font-ui text-[17px] uppercase tracking-[0.18em] ${tone === "wine" ? "text-marbleDim" : "text-wine opacity-85"}`}>{label}</p>
      <p className={`mt-2 font-display text-[34px] leading-none tracking-[0.02em] ${ink}`}>{value}</p>
      {sub && <p className={`mt-2 font-body text-[19px] italic ${tone === "wine" ? "text-marbleDim" : "text-wine opacity-85"}`}>{sub}</p>}
    </div>
  );
}

export function Bar({
  value,
  max = 100,
  color = "wine",
}: {
  value: number;
  max?: number;
  color?: "wine" | "gold";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-[9px] w-full overflow-hidden rounded-pill border border-wine/40 bg-marbleDim">
      <div
        className={`h-full rounded-pill transition-all duration-700 ${color === "gold" ? "bg-wine/70" : "bg-wine"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 108,
  stroke = 8,
  color = "wine",
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: "wine" | "gold";
  label: string;
  sub?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--atlas-light-rgb))" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--atlas-charcoal)"
            strokeOpacity={color === "gold" ? 0.72 : 1}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-[23px] text-wine">{label}</span>
        </div>
      </div>
      {sub && <p className="font-ui text-[17px] uppercase tracking-[0.16em] text-wine opacity-65">{sub}</p>}
    </div>
  );
}

export function Badge({
  children,
  tone = "gold",
}: {
  children: React.ReactNode;
  tone?: "gold" | "wine" | "marble" | "dim";
}) {
  const tones: Record<string, string> = {
    gold: "bg-marbleDim border-wine text-wine",
    wine: "bg-wine border-wine text-marble",
    marble: "bg-marble border-wine text-wine",
    dim: "bg-marble border-wine/45 text-wine/80",
  };
  return (
    <span
      className={`inline-flex items-center rounded-pill border-2 px-3 py-0.5 font-ui text-[16.5px] uppercase tracking-[0.14em] ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: { key: string; label: string; href?: string }[];
  value: string;
  onChange?: (k: string) => void;
}) {
  return (
    <div className="glass-card flex flex-wrap items-center gap-1.5 p-1.5">
      {tabs.map((t) => {
        const active = t.key === value;
        const cls = `block rounded-pill px-4 py-2.5 font-ui text-[17.5px] uppercase tracking-[0.15em] transition-colors ${
          active ? "bg-wine text-marble" : "text-wine hover:bg-marbleDim"
        }`;
        return t.href ? (
          <Link key={t.key} href={t.href} className={cls}>
            {t.label}
          </Link>
        ) : (
          <button key={t.key} onClick={() => onChange?.(t.key)} className={cls}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center font-body text-[20px] italic text-wine opacity-55">{children}</p>;
}

export function TwinLink({
  href,
  greek,
  name,
  blurb,
  image,
}: {
  href: string;
  greek: string;
  name: string;
  blurb: string;
  image?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border-2 border-wine bg-wine px-5 py-4 transition-colors hover:bg-marbleDim"
    >
      <div className="flex items-center gap-4">
        {image && (
          <span className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-marble group-hover:border-wine">
            <img src={image} alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <div>
          <p className="font-ui text-[17px] uppercase tracking-[0.22em] text-marble opacity-80 group-hover:text-wine">{greek}</p>
          <p className="mt-1 font-display text-[25px] tracking-[0.05em] text-marble group-hover:text-wine">{name}</p>
          <p className="mt-1 font-body text-[20px] italic text-marble opacity-75 group-hover:text-wine group-hover:opacity-85">
            {blurb}
          </p>
        </div>
      </div>
      <span className="shrink-0 font-ui text-[18px] uppercase tracking-[0.16em] text-marble group-hover:text-wine">Open →</span>
    </Link>
  );
}
