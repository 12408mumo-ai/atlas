/* ------------------------------------------------------------------ */
/*  PersistentAiOrb — Single continuously-spinning AI orb mounted in  */
/*  RootLayout across the entire site:                                */
/*  • On `/` it is the woven ribbon sphere, resting behind the sign-  */
/*    in form as the backdrop.                                        */
/*  • On every other page it glides to the left side and stays there  */
/*    continuously spinning.                                          */
/* ------------------------------------------------------------------ */

"use client";

import { usePathname, useRouter } from "next/navigation";
import { AiGlobeSphere } from "@/components/AiGlobeSphere";
import { RibbonSphere } from "@/components/RibbonSphere";

const DARK_BG_ROUTES = new Set(["/", "/login", "/hub", "/flow-wave"]);

export function PersistentAiOrb() {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const isWelcome = pathname === "/";
  const onLightSurface = !isWelcome && !DARK_BG_ROUTES.has(pathname);

  const handleOrbClick = () => {
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
          ariaLabel="Atlas AI spinning orb — tap to open Atlas AI"
        />
      )}
    </div>
  );
}
