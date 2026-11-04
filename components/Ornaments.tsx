"use client";

/* Small, dependency-free Greek ornament library. */

export function Meander({ className = "", height = 18 }: { className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden ${className}`} style={{ height }}>
      <svg
        viewBox="0 0 240 18"
        preserveAspectRatio="none"
        className="w-full h-full opacity-60"
        aria-hidden
      >
        <defs>
          <linearGradient id="meanderGrad" x1="0" x2="1">
            <stop offset="0" stopColor="#e2b563" stopOpacity="0" />
            <stop offset=".2" stopColor="#e2b563" stopOpacity=".9" />
            <stop offset=".8" stopColor="#e2b563" stopOpacity=".9" />
            <stop offset="1" stopColor="#e2b563" stopOpacity="0" />
          </linearGradient>
          <pattern id="meanderPat" width="24" height="18" patternUnits="userSpaceOnUse">
            <path
              d="M2 16V5h13v8H7v-4h5"
              fill="none"
              stroke="url(#meanderGrad)"
              strokeWidth="1.4"
              strokeLinecap="square"
            />
          </pattern>
        </defs>
        <rect width="240" height="18" fill="url(#meanderPat)" />
      </svg>
    </div>
  );
}

export function LaurelDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 ${className}`} aria-hidden>
      <span className="rule-gold w-16 sm:w-28" />
      <svg width="34" height="16" viewBox="0 0 34 16" className="text-gold/80">
        <path d="M17 1.5 18.9 6l4.8.4-3.7 3.1 1.2 4.7L17 11.6 12.8 14.2l1.2-4.7L10.3 6.4 15.1 6z" fill="currentColor" opacity=".9" />
      </svg>
      <span className="rule-gold w-16 sm:w-28" />
    </div>
  );
}

export function Stars({ count = 46, className = "" }: { count?: number; className?: string }) {
  const seeds = Array.from({ length: count }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453;
    const b = Math.sin(i * 78.233) * 12345.6789;
    return {
      left: `${Math.abs(a % 1) * 100}%`,
      top: `${Math.abs(b % 1) * 100}%`,
      size: 1 + Math.abs((a * 3) % 1) * 1.8,
      delay: `${Math.abs(b % 1) * 6}s`,
      dur: `${3 + Math.abs(a % 1) * 5}s`,
    };
  });
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      {seeds.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#f6e2b4]"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animation: `twinkle ${s.dur} ease-in-out ${s.delay} infinite`,
            boxShadow: "0 0 6px rgba(243,215,154,.8)",
          }}
        />
      ))}
    </div>
  );
}

export function GreekKeyCorner({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        d="M1 39V9a8 8 0 0 1 8-8h30"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity=".7"
      />
      <path
        d="M7 39V14a7 7 0 0 1 7-7h25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        opacity=".45"
      />
    </svg>
  );
}
