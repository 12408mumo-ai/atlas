/* ------------------------------------------------------------------ */
/*  PersistentAiOrb — Single continuously-spinning AI orb mounted in  */
/*  RootLayout across the entire site:                                */
/*  • On `/` it is the woven ribbon sphere, resting behind the sign-  */
/*    in form as the backdrop.                                        */
/*  • On every other page it glides to the left side and stays there  */
/*    continuously spinning.                                          */
/* ------------------------------------------------------------------ */

"use client";

import { usePathname } from "next/navigation";
import { lazy, Suspense, useCallback, useState } from "react";

// Conversation and the AI/data modules are only needed after the orb is opened.
const OrbConversation = lazy(() => import("@/components/OrbConversation").then((m) => ({ default: m.OrbConversation })));
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { RibbonSphere } from "@/components/RibbonSphere";

const DARK_BG_ROUTES = new Set(["/", "/login", "/hub", "/flow-wave"]);

export function PersistentAiOrb() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const isWelcome = pathname === "/";
  const onLightSurface = !isWelcome && !DARK_BG_ROUTES.has(pathname);

  const handleOrbClick = () => { if (pathname !== "/login") { setHasOpened(true); setOpen(true); } };

  // The standalone clock is intentionally distraction-free.
  if (pathname === "/clock") return null;

  return (
    <>
    {hasOpened && <Suspense fallback={open ? <div role="dialog" aria-label="Opening Atlas" className="fixed inset-0 z-[1000] grid place-items-center bg-[#161b29] text-[#f5e8d3]"><p role="status">Opening Atlas…</p><button type="button" onClick={close}>Close</button></div> : null}><OrbConversation open={open} onClose={close} /></Suspense>}
    <div
      style={{
        transition:
          "left 820ms cubic-bezier(0.22, 1, 0.36, 1), top 820ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className={
        open
          ? "pointer-events-none fixed left-1/2 top-[26%] z-[1010] h-[min(68vw,420px)] w-[min(68vw,420px)] -translate-x-1/2 -translate-y-1/2 scale-100 motion-reduce:!transition-none"
          : isWelcome
          ? // Behind the sign-in form, so it reads as the backdrop.
            "pointer-events-none fixed left-[calc(50%+0px)] top-[calc(50%-42px)] z-0 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-100 opacity-60 sm:h-[420px] sm:w-[420px]"
          : "fixed left-[calc(0%+38px)] top-[calc(50%+0px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-[0.22] sm:left-[calc(0%+54px)] sm:h-[380px] sm:w-[380px] sm:scale-[0.23]"
      }
    >
      {isWelcome ? (
        <RibbonSphere />
      ) : (
        <AiGlobeSphere
          onLightSurface={onLightSurface}
          onClick={handleOrbClick}
          ariaLabel="Open Atlas voice and commands"
        />
      )}
    </div>
    </>
  );
}
