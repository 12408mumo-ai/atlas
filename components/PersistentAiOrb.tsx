"use client";

import { usePathname } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const OrbConversation = lazy(() => import("@/components/OrbConversation").then((m) => ({ default: m.OrbConversation })));
const Orb = lazy(() => import("@/components/Orb"));

export function PersistentAiOrb() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [ready, setReady] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const markReady = useCallback(() => setReady(true), []);
  const markUnavailable = useCallback(() => setReady(false), []);
  const entry = pathname === "/" || pathname === "/login" || pathname === "/clock";

  useEffect(() => { if (entry) setReady(false); }, [entry]);
  if (entry) return null;

  return (
    <>
      {open && <div aria-hidden="true" className="fixed inset-0 z-[980] bg-wine" />}
      {hasOpened && <Suspense fallback={open ? <div role="dialog" aria-label="Opening Atlas" className="fixed inset-0 z-[1000] grid place-items-center bg-wine text-marble"><p role="status">Opening Atlas…</p><button type="button" onClick={close}>Close</button></div> : null}><OrbConversation open={open} onClose={close} /></Suspense>}
      <div
        style={{ transition: "left 820ms cubic-bezier(0.22, 1, 0.36, 1), top 820ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        className={open
          ? "pointer-events-none fixed left-1/2 top-[26%] z-[990] h-[min(72vw,48vh,480px)] w-[min(72vw,48vh,480px)] -translate-x-1/2 -translate-y-1/2 scale-100 motion-reduce:!transition-none"
          : "fixed left-[calc(0%+38px)] top-1/2 z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-[0.26] sm:left-[calc(0%+54px)] sm:h-[380px] sm:w-[380px] sm:scale-[0.26] motion-reduce:!transition-none"}
      >
        <button type="button" onClick={() => { setHasOpened(true); setOpen(true); }} aria-label="Open Atlas voice and commands" aria-hidden={open || undefined} tabIndex={open ? -1 : 0} className="relative h-full w-full overflow-hidden rounded-full bg-wineDeep outline-none focus-visible:ring-4 focus-visible:ring-marble">
          {!ready && <span aria-hidden="true" className="absolute inset-[14%] rounded-full border-2 border-marble bg-wineDeep shadow-[0_0_30px_var(--atlas-sand)]" />}
          <Suspense fallback={null}>
            <Orb colors={["#C2B280", "#eee9d9", "#36454F"]} backgroundColor="#27333b" size={0.9} hoverIntensity={1} trail={1} rotateOnHover followCursor dpr={1.25} onReady={markReady} onUnavailable={markUnavailable} />
          </Suspense>
        </button>
      </div>
    </>
  );
}
