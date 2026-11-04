"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { isConfigured } from "@/lib/atlas-ai";

/* ------------------------------------------------------------------ */
/*  AtlasSideIcon — the little orb that waits at the edge of every    */
/*  page. One touch and the Titan's temple opens. A gold pulse means  */
/*  the Titan still sleeps: no API key has been laid yet.             */
/* ------------------------------------------------------------------ */

const HIDDEN_PREFIXES = ["/atlas", "/login", "/flow-wave"];

export function AtlasSideIcon() {
  const pathname = usePathname();
  const [configured, setConfigured] = useState(true); // assume awake → no SSR flash
  const [hover, setHover] = useState(false);

  useEffect(() => {
    setConfigured(isConfigured());
  }, [pathname]);

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  return (
    <Link
      href="/atlas"
      aria-label="Ask Atlas — open the Atlas AI assistant"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      className="group fixed right-4 top-1/2 z-50 -translate-y-1/2 sm:right-5"
    >
      <span className="flex items-center">
        {/* the sliding label */}
        <span
          className={`overflow-hidden whitespace-nowrap transition-all duration-300 ease-out ${
            hover ? "mr-2 max-w-[140px] opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          <span className="rounded-pill border-2 border-wine bg-marble px-3 py-2 font-ui text-[9px] uppercase tracking-[0.22em] text-wine shadow-sm">
            Ask Atlas
          </span>
        </span>

        {/* the orb itself */}
        <span className="relative block">
          {/* pulse ring while the Titan sleeps (no key laid) */}
          {!configured && (
            <span className="absolute inset-0 animate-ping rounded-full border-2 border-gold opacity-60" aria-hidden />
          )}
          <span
            className={`grid h-12 w-12 place-items-center rounded-full border-2 transition-colors duration-200 sm:h-14 sm:w-14 ${
              configured
                ? "border-wine bg-wine group-hover:border-gold group-hover:bg-gold"
                : "border-gold bg-wine group-hover:bg-wineDeep"
            }`}
          >
            {/* the celestial sphere glyph */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className={`transition-colors duration-200 ${configured ? "group-hover:[&_*]:stroke-wine" : ""}`}
              aria-hidden
            >
              <circle cx="12" cy="12" r="8" stroke={configured ? "#c6a15b" : "#c6a15b"} strokeWidth="2" />
              <ellipse cx="12" cy="12" rx="8" ry="3.4" stroke={configured ? "#f4efe6" : "#c6a15b"} strokeWidth="1.4" />
              <circle cx="12" cy="4.8" r="1.15" fill={configured ? "#f4efe6" : "#c6a15b"} />
            </svg>
          </span>
          {/* status ember */}
          <span
            className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-marble ${
              configured ? "bg-gold" : "bg-wine"
            }`}
            aria-hidden
          />
        </span>
      </span>
    </Link>
  );
}
