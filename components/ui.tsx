"use client";

import Link from "next/link";
import { useId } from "react";
import { GreekKeyCorner } from "./Ornaments";

export function Panel({
  title,
  hint,
  action,
  children,
  className = "",
  icon,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <section className={`relative glass rounded-sm p-5 sm:p-6 shadow-relic ${className}`}>
      <GreekKeyCorner className="pointer-events-none absolute right-2 top-2 h-6 w-6 text-gold/25" />
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {icon && <span className="mt-0.5 h-4 w-4 shrink-0 text-gold/80">{icon}</span>}
          <div>
            <h2 className="font-ui text-[10px] uppercase tracking-[.3em] text-gold/85">{title}</h2>
            {hint && <p className="mt-1.5 font-body text-[13px] italic leading-snug text-marble/40">{hint}</p>}
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
  accent = "#e2b563",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="relative overflow-hidden border border-white/[.06] bg-white/[.015] px-4 py-4">
      <span className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${accent}88,transparent)` }} />
      <p className="font-ui text-[9px] uppercase tracking-[.26em] text-marble/40">{label}</p>
      <p className="mt-2 font-display text-[26px] leading-none tracking-[.02em] text-marble/95">{value}</p>
      {sub && <p className="mt-1.5 font-body text-[11.5px] italic text-marble/35">{sub}</p>}
    </div>
  );
}

export function Bar({ value, max = 100, accent = "#e2b563" }: { value: number; max?: number; accent?: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="h-[5px] w-full overflow-hidden rounded-full bg-white/[.07]">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}77, ${accent})`, boxShadow: `0 0 12px ${accent}66` }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 96,
  stroke = 5,
  accent = "#e2b563",
  label,
  sub,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  accent?: string;
  label: string;
  sub?: string;
}) {
  const id = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={accent} stopOpacity=".55" />
              <stop offset="1" stopColor={accent} />
            </linearGradient>
          </defs>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={`url(#g${id})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-[17px] text-marble/95">{label}</span>
        </div>
      </div>
      {sub && <p className="font-ui text-[9px] uppercase tracking-[.22em] text-marble/40">{sub}</p>}
    </div>
  );
}

export function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "red" | "blue" | "dim" }) {
  const tones: Record<string, string> = {
    gold: "border-gold/35 text-goldBright bg-gold/[.08]",
    green: "border-laurel/40 text-laurel bg-laurel/10",
    red: "border-[#d98f7a]/40 text-[#e5a794] bg-[#d98f7a]/10",
    blue: "border-aegean/50 text-[#9dc4d8] bg-aegean/10",
    dim: "border-white/10 text-marble/45 bg-white/[.03]",
  };
  return (
    <span className={`inline-flex items-center border px-2 py-[3px] font-ui text-[8.5px] uppercase tracking-[.2em] ${tones[tone]}`}>
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
    <div className="flex flex-wrap items-center gap-1 border-b border-white/[.07] pb-0">
      {tabs.map((t) => {
        const active = t.key === value;
        const inner = (
          <span
            className={`relative block px-4 py-2.5 font-ui text-[10px] uppercase tracking-[.24em] transition ${
              active ? "text-goldBright" : "text-marble/45 hover:text-marble/80"
            }`}
          >
            {t.label}
            {active && <span className="absolute inset-x-3 -bottom-[1px] h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent" />}
          </span>
        );
        return t.href ? (
          <Link key={t.key} href={t.href}>{inner}</Link>
        ) : (
          <button key={t.key} onClick={() => onChange?.(t.key)}>{inner}</button>
        );
      })}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center font-body text-[13px] italic text-marble/30">{children}</p>;
}

export function TwinLink({ href, greek, name, blurb }: { href: string; greek: string; name: string; blurb: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 border border-gold/20 bg-gradient-to-r from-gold/[.07] to-transparent px-5 py-4 transition-all hover:border-gold/50 hover:from-gold/[.12]"
    >
      <div>
        <p className="eyebrow !tracking-[.34em]">{greek}</p>
        <p className="mt-1.5 font-display text-[19px] tracking-[.08em] text-marble/90 group-hover:text-goldBright transition">
          {name}
        </p>
        <p className="mt-1 font-body text-[12.5px] italic text-marble/40">{blurb}</p>
      </div>
      <span className="font-ui text-[10px] uppercase tracking-[.24em] text-gold/60 transition group-hover:translate-x-1 group-hover:text-goldBright">
        Open →
      </span>
    </Link>
  );
}
