"use client";

/* Flat, two-colour Greek ornament library.
   Warm cream (var(--atlas-sand)) · Charcoal (var(--atlas-charcoal)). No gradients. */

export function Meander({ className = "", height = 18 }: { className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ height }} aria-hidden>
      <svg viewBox="0 0 240 18" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <pattern id="meanderFlat" width="24" height="18" patternUnits="userSpaceOnUse">
            <path d="M2 16V5h13v8H7v-4h5" fill="none" stroke="var(--atlas-sand)" strokeWidth="2" strokeLinecap="square" />
          </pattern>
        </defs>
        <rect width="240" height="18" fill="url(#meanderFlat)" />
      </svg>
    </div>
  );
}

export function MeanderWine({ className = "", height = 18 }: { className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ height }} aria-hidden>
      <svg viewBox="0 0 240 18" preserveAspectRatio="none" className="h-full w-full">
        <defs>
          <pattern id="meanderWine" width="24" height="18" patternUnits="userSpaceOnUse">
            <path d="M2 16V5h13v8H7v-4h5" fill="none" stroke="var(--atlas-charcoal)" strokeWidth="2" strokeLinecap="square" />
          </pattern>
        </defs>
        <rect width="240" height="18" fill="url(#meanderWine)" />
      </svg>
    </div>
  );
}

export function LaurelDivider({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const ruleCls = tone === "dark" ? "bg-marble/60" : "bg-wine";
  const starCls = tone === "dark" ? "text-marble" : "text-wine";
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className={`h-[2px] w-16 sm:w-28 ${ruleCls}`} />
      <svg width="36" height="18" viewBox="0 0 34 16" className={starCls}>
        <path d="M17 1.5 18.9 6l4.8.4-3.7 3.1 1.2 4.7L17 11.6 12.8 14.2l1.2-4.7L10.3 6.4 15.1 6z" fill="currentColor" />
      </svg>
      <span className={`h-[2px] w-16 sm:w-28 ${ruleCls}`} />
    </div>
  );
}

export function GreekKeyCorner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path d="M1 39V9a8 8 0 0 1 8-8h30" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 39V15a7 7 0 0 1 7-7h24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".55" />
    </svg>
  );
}

export function GoldDots({ count = 24, className = "" }: { count?: number; className?: string }) {
  const seeds = Array.from({ length: count }, (_, i) => {
    const a = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1);
    const b = Math.abs((Math.sin(i * 78.233) * 12345.6789) % 1);
    return { left: `${a * 100}%`, top: `${b * 100}%`, size: 4 + b * 5 };
  });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {seeds.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-marble"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
        />
      ))}
    </div>
  );
}
