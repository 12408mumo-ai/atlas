"use client";

import { useRouter } from "next/navigation";
import { enterAsGuest } from "@/lib/store";

/** Both entry routes lead into the same browser-local world. */
export function EntryScreen() {
  const router = useRouter();

  function enter() {
    enterAsGuest();
    router.push("/hub");
  }

  return (
    <main className="flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-5 py-8 text-marble">
      <p className="font-ui text-[11px] uppercase tracking-[0.42em] text-marbleDim sm:text-xs">The world you carry</p>
      <h1 className="mt-3 font-display text-[clamp(32px,7vw,52px)] tracking-[0.18em]">ATLAS</h1>
      <button type="button" onClick={enter} aria-label="Enter Atlas" className="group relative mt-3 block w-[min(78vw,440px)] rounded-full outline-none focus-visible:ring-2 focus-visible:ring-marble focus-visible:ring-offset-4 focus-visible:ring-offset-wine">
        <img src="/assets/zeus-entry.webp" alt="" width="800" height="800" fetchPriority="high" style={{ maskImage: "radial-gradient(circle, #000 48%, transparent 72%)", WebkitMaskImage: "radial-gradient(circle, #000 48%, transparent 72%)" }} className="h-auto w-full rounded-full transition-transform duration-500 group-hover:scale-[1.025] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
      </button>
      <p className="mt-5 text-center font-ui text-[11px] uppercase tracking-[0.25em] text-marbleDim sm:text-xs">Tap the face to enter</p>
      <p className="mt-3 text-center font-body text-base text-marbleDim">Your world stays in this browser.</p>
    </main>
  );
}
