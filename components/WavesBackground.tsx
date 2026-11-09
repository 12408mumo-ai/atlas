"use client";

import { lazy, Suspense } from "react";
import { usePathname } from "next/navigation";

const Waves = lazy(() => import("@/components/Waves"));

/** One decorative canvas shared by routes; content remains fully interactive. */
export function WavesBackground() {
  const path = usePathname() || "/";
  const dark = path === "/" || path === "/login" || path === "/hub" || path === "/flow-wave";
  return (
    <div aria-hidden="true" className="atlas-waves-background" style={{ backgroundColor: dark ? "#36454F" : "#e4dfcf" }}>
      <Suspense fallback={null}>
        <Waves lineColor={dark ? "#C2B280" : "#36454F"} accentColor={dark ? "#eee9d9" : "#36454F"} spacing={18} amplitude={22} speed={0.35} twist={0.65} opacity={dark ? 0.24 : 0.16} dpr={1} />
      </Suspense>
    </div>
  );
}
