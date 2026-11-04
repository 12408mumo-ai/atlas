"use client";

import Link from "next/link";
import { GreekKeyCorner } from "./Ornaments";

/* Flat three-colour UI kit: marble surface, wine structure, gold accent.
   No gradients anywhere — every fill is a single solid colour. */

export function Panel({
  title,
  hint,
  action,
  children,
  className = "",
  icon,
  tone = "marble",
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  tone?: "marble" | "wine";
}) {
  const wine = tone === "wine";
  return (
    <section
      className={`relative rounded-2xl border-2 p-5 sm:p-6 ${
        wine ? "border-gold bg-wine" : "border-wine bg-marble"
      } ${className}`}
    >
      <GreekKeyCorner className={`pointer-events-none absolute right-2.5 top-2.5 h-6 w-6 ${wine ? "text-gold" : "text-wine"}`} />
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <span className={`mt-0.5 h-4 w-4 shrink-0 ${wine ? "text-gold" : "text-wine"}`}>{icon}</span>}
          <div>
            <h2 className={`font-ui text-[14px] uppercase tracking-[0.28em] ${wine ? "text-gold" : "text-wine"}`}>{title}</h2>
            {hint && (
              <p className={`mt-1.5 font-body text-[16px] italic leading-snug ${wine ? "text-marble opacity-70" : "text-wine opacity-60"}`}>
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
  const bg = tone === "wine" ? "bg-wine border-gold" : tone === "gold" ? "bg-marbleDim border-wine" : "bg-marble border-wine";
  const ink = tone === "wine" ? "text-marble" : "text-wine";
  return (
    <div className={`rounded-xl border-2 px-4 py-4 ${bg}`}>
      <p className={`font-ui text-[13px] uppercase tracking-[0.24em] ${ink} opacity-65`}>{label}</p>
      <p className={`mt-2 font-display text-[28px] leading-none tracking-[0.02em] ${ink}`}>{value}</p>
      {sub && <p className={`mt-1.5 font-body text-[14.5px] italic ${ink} opacity-55`}>{sub}</p>}
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
    <div className="h-[7px] w-full overflow-hidden rounded-pill border border-wine/30 bg-marbleDim">
      <div
        className={`h-full rounded-pill transition-all duration-700 ${color === "gold" ? "bg-wineDeep" : "bg-wine"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 92,
  stroke = 7,
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
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E9DCC4" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color === "gold" ? "#19191B" : "#28282A"}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 800ms ease" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-[18px] text-wine">{label}</span>
        </div>
      </div>
      {sub && <p className="font-ui text-[13px] uppercase tracking-[0.2em] text-wine opacity-60">{sub}</p>}
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
    gold: "bg-gold border-wine text-wine",
    wine: "bg-wine border-wine text-marble",
    marble: "bg-marble border-wine text-wine",
    dim: "bg-marbleDim border-wine text-wine",
  };
  return (
    <span
      className={`inline-flex items-center rounded-pill border-2 px-2.5 py-[2px] font-ui text-[12.5px] uppercase tracking-[0.18em] ${tones[tone]}`}
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
    <div className="flex flex-wrap items-center gap-1.5 rounded-pill border-2 border-wine bg-marble p-1.5">
      {tabs.map((t) => {
        const active = t.key === value;
        const cls = `block rounded-pill px-4 py-2 font-ui text-[13.5px] uppercase tracking-[0.2em] transition-colors ${
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
  return <p className="py-6 text-center font-body text-[16px] italic text-wine opacity-50">{children}</p>;
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
      className="group flex items-center justify-between gap-4 rounded-2xl border-2 border-gold bg-wine px-5 py-4 transition-colors hover:bg-gold"
    >
      <div className="flex items-center gap-4">
        {image && (
          <span className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-gold">
            <img src={image} alt="" className="h-full w-full object-cover" />
          </span>
        )}
        <div>
          <p className="font-ui text-[13px] uppercase tracking-[0.3em] text-gold group-hover:text-wine">{greek}</p>
          <p className="mt-1 font-display text-[20px] tracking-[0.06em] text-marble group-hover:text-wine">{name}</p>
          <p className="mt-1 font-body text-[15.5px] italic text-marble opacity-70 group-hover:text-wine group-hover:opacity-80">
            {blurb}
          </p>
        </div>
      </div>
      <span className="shrink-0 font-ui text-[14px] uppercase tracking-[0.2em] text-gold group-hover:text-wine">Open →</span>
    </Link>
  );
}
