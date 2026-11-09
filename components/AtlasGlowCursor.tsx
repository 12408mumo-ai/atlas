"use client";

import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { usePathname } from "next/navigation";

const GlowCursor = lazy(() => import("@/components/GlowCursor")) as ComponentType<{
  color: string; secondaryColor: string; theme: string; intensity: number; trailWidth: number;
  linger: number; glow: number; clickBurst: boolean; quality: string; maxDevicePixelRatio: number;
  className: string; "aria-hidden": boolean;
}>;

export function AtlasGlowCursor() {
  const pathname = usePathname() || "/";
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const pointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setAvailable(pointer.matches && !motion.matches);
    update();
    pointer.addEventListener("change", update); motion.addEventListener("change", update);
    return () => { pointer.removeEventListener("change", update); motion.removeEventListener("change", update); };
  }, []);
  if (!available) return null;
  const dark = pathname === "/" || pathname === "/login" || pathname === "/hub" || pathname === "/flow-wave";
  return (
    <Suspense fallback={null}>
      <GlowCursor className="atlas-glow-cursor" aria-hidden color={dark ? "#C2B280" : "#36454F"} secondaryColor={dark ? "#9d8b60" : "#6b7e82"} theme={dark ? "dark" : "light"} intensity={0.8} trailWidth={2.5} linger={0.8} glow={0.65} clickBurst quality="low" maxDevicePixelRatio={1} />
    </Suspense>
  );
}
