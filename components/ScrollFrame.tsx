"use client";

/* A flat parchment-free scroll: warm cream sheet, charcoal rules and
   turned rods. Two colours of ink only — no gradients, no texture. */

export function ScrollFrame({
  children,
  className = "",
  width = 520,
}: {
  children: React.ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div className={`relative ${className}`} style={{ maxWidth: width }}>
      <Rod side="left" />
      <Rod side="right" />

      <div className="relative mx-[22px] overflow-hidden rounded-[6px] border-2 border-wine bg-marble sm:mx-[30px]">
        <div className="relative px-7 py-9 sm:px-10 sm:py-11">{children}</div>
      </div>
    </div>
  );
}

function Rod({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={`absolute top-[-14px] bottom-[-14px] w-[44px] rounded-pill border-2 border-wine bg-marbleDim sm:w-[58px] ${
        side === "left" ? "left-0" : "right-0"
      }`}
      aria-hidden
    >
      {/* turned rings, flat charcoal bars */}
      <div className="absolute left-0 right-0 top-[14%] h-[6px] bg-wine" />
      <div className="absolute left-0 right-0 bottom-[14%] h-[6px] bg-wine" />
      <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-wine opacity-40" />
    </div>
  );
}
