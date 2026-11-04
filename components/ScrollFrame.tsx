"use client";

/* A parchment scroll: two turned wooden rods with gilt caps, holding a
   sheet of aged paper. Purely decorative — children are the content. */

export function ScrollFrame({
  children,
  className = "",
  width = 470,
}: {
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div className={`relative ${className}`} style={{ maxWidth: width }}>
      {/* soft glow behind the scroll */}
      <div className="pointer-events-none absolute -inset-10 -z-10 opacity-70 blur-2xl"
        style={{ background: "radial-gradient(closest-side, rgba(226,181,99,.22), transparent 70%)" }} />

      <Rod side="left" />
      <Rod side="right" />

      <div
        className="relative mx-[26px] sm:mx-[34px] shadow-[0_40px_90px_-30px_rgba(0,0,0,.95)]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(232,220,192,.97), rgba(222,206,172,.97) 35%, rgba(228,214,183,.97) 68%, rgba(213,196,161,.97))",
          borderTop: "1px solid rgba(255,248,228,.55)",
          borderBottom: "1px solid rgba(120,96,58,.45)",
        }}
      >
        {/* paper grain */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[.16] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.78' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='240' height='240' filter='url(%23n)' opacity='.55'/%3E%3C/svg%3E\")",
          }}
        />
        {/* aged edges */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            boxShadow:
              "inset 22px 0 34px -26px rgba(96,72,38,.55), inset -22px 0 34px -26px rgba(96,72,38,.55), inset 0 18px 26px -22px rgba(96,72,38,.5), inset 0 -18px 26px -22px rgba(96,72,38,.5)",
          }}
        />
        {/* subtle stains */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[.12]"
          style={{
            background:
              "radial-gradient(140px 90px at 18% 12%, #8a6a35, transparent 70%), radial-gradient(160px 120px at 84% 88%, #8a6a35, transparent 72%)",
            mixBlendMode: "multiply",
          }}
        />
        <div className="relative px-7 py-9 sm:px-10 sm:py-11">{children}</div>
      </div>

      {/* bottom shadow of the sheet */}
      <div className="mx-[26px] sm:mx-[34px] h-4"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, rgba(0,0,0,.55), transparent 75%)" }} />
    </div>
  );
}

function Rod({ side }: { side: "left" | "right" }) {
  return (
    <div className={`absolute top-[-18px] bottom-[-18px] ${side === "left" ? "left-0" : "right-0"} w-[54px] sm:w-[68px]`}>
      <div
        className="relative h-full w-full rounded-[30px]"
        style={{
          background:
            "linear-gradient(90deg, #3a2a16 0%, #6d5128 12%, #a8823f 32%, #d9b878 46%, #f0dcae 52%, #c8a262 62%, #8a672f 80%, #402e18 100%)",
          boxShadow:
            "inset 0 0 24px rgba(0,0,0,.55), 0 24px 50px -18px rgba(0,0,0,.9)",
        }}
      >
        {/* turned rings */}
        {[8, 50].map((p) => (
          <div key={p} className="absolute left-0 right-0 h-[6px] opacity-70"
            style={{ top: `${p}%`, background: "linear-gradient(90deg, rgba(0,0,0,.5), rgba(255,240,200,.7), rgba(0,0,0,.55))" }} />
        ))}
        {/* gilt finials */}
        <div className="absolute -top-4 left-1/2 h-4 w-[30px] -translate-x-1/2 rounded-t-[14px]"
          style={{ background: "linear-gradient(90deg,#5c421d,#e8c887,#8a672f)" }} />
        <div className="absolute -bottom-4 left-1/2 h-4 w-[30px] -translate-x-1/2 rounded-b-[14px]"
          style={{ background: "linear-gradient(90deg,#5c421d,#e8c887,#8a672f)" }} />
      </div>
    </div>
  );
}
