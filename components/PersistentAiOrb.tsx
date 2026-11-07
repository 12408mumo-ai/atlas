/* ------------------------------------------------------------------ */
/*  PersistentAiOrb — Single continuously-spinning AI orb mounted in  */
/*  RootLayout across the entire site:                                */
/*  • On `/` it is the woven ribbon sphere.                            */
/*  • Smoothly glides to the left side when you enter, and stays     */
/*    there continuously spinning on every page.                       */
/* ------------------------------------------------------------------ */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { RibbonSphere } from "@/components/RibbonSphere";

const DARK_BG_ROUTES = new Set(["/", "/login", "/hub", "/flow-wave"]);

export function PersistentAiOrb() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [dockInitiated, setDockInitiated] = useState(false);

  const isWelcome = pathname === "/" && !dockInitiated;
  const onLightSurface = !isWelcome && !DARK_BG_ROUTES.has(pathname);

  // Sync dock state with pathname.
  useEffect(() => {
    if (pathname === "/") {
      setDockInitiated(false);
    }
  }, [pathname]);

  const handleOrbClick = () => {
    if (isWelcome) {
      router.push("/login");
      return;
    }
    if (pathname !== "/login" && pathname !== "/atlas") {
      router.push("/atlas");
    }
  };

  return (
    <div
      style={{
        transition:
          "left 820ms cubic-bezier(0.22, 1, 0.36, 1), top 820ms cubic-bezier(0.22, 1, 0.36, 1), transform 820ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
      className={
        isWelcome
          ? "fixed left-[calc(50%+0px)] top-[calc(50%-42px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-100 sm:h-[420px] sm:w-[420px]"
          : "fixed left-[calc(0%+38px)] top-[calc(50%+0px)] z-[950] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 scale-[0.22] sm:left-[calc(0%+54px)] sm:h-[380px] sm:w-[380px] sm:scale-[0.23]"
      }
    >
      {isWelcome ? (
        <RibbonSphere />
      ) : (
        <AiGlobeSphere
          onLightSurface={onLightSurface}
          onClick={handleOrbClick}
          ariaLabel="Atlas AI spinning orb — tap to open Atlas AI"
        />
      )}
    </div>
  );
}
