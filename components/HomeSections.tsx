"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type ReactNode, type RefAttributes } from "react";
import CardSwap, { Card } from "@/components/CardSwap";

const sections = [
  { title: "Work", href: "/work", detail: "Projects, plans and progress", number: "01" },
  { title: "Study", href: "/study", detail: "Learning, courses and timetable", number: "02" },
  { title: "People", href: "/people", detail: "The people who matter", number: "03" },
  { title: "Life", href: "/life", detail: "Habits, health and everyday life", number: "04" },
  { title: "Memories", href: "/memories", detail: "Moments worth keeping", number: "05" },
  { title: "Atlas AI", href: "/atlas", detail: "A little help with your world", number: "06" },
];
type Controls = { next: () => void; prev: () => void };
type SwapProps = { children: ReactNode; width: number; height: number; cardDistance: number; verticalDistance: number; depth: number; visibleCards: number; skewAmount: number; parallax: number; delay: number; autoplay: boolean; onChange: (index: number) => void; onCardClick: (index: number) => void; className: string };
const Swap = CardSwap as ComponentType<SwapProps & RefAttributes<Controls>>;
const Tile = Card as ComponentType<{ children: ReactNode }>;

export function HomeSections() {
  const router = useRouter();
  const swap = useRef<Controls>(null);
  const indexRef = useRef(0);
  const [index, setIndex] = useState(0);
  const stackArea = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(true);
  useEffect(() => {
    const node = stackArea.current;
    if (!node) return;
    const update = () => setCompact(node.clientWidth < 390);
    const observer = new ResizeObserver(update);
    observer.observe(node); update();
    return () => observer.disconnect();
  }, []);
  const select = (next: number) => { indexRef.current = next; setIndex(next); };

  return (
    <div className="grid flex-1 items-center gap-4 py-8 lg:grid-cols-2 lg:gap-12">
      <section aria-label="Browse your sections" className="min-w-0">
        <div ref={stackArea} className="home-stack h-[260px] w-full sm:h-[320px]">
          <Swap ref={swap} width={compact ? 260 : 350} height={compact ? 210 : 235} cardDistance={compact ? 25 : 38} verticalDistance={compact ? 25 : 34} depth={85} visibleCards={3} skewAmount={3} parallax={0.12} delay={6500} autoplay={false} className="atlas-card-stack" onChange={select} onCardClick={(chosen) => { if (chosen === indexRef.current) router.push(sections[chosen].href); }}>
            {sections.map((section) => (
              <Tile key={section.href}>
                <div className="flex h-full flex-col justify-between p-7 text-marble sm:p-9">
                  <div className="flex items-center justify-between font-ui text-xs uppercase tracking-[0.2em] text-marbleDim"><span>Atlas</span><span>{section.number} / 06</span></div>
                  <div><h2 className={`font-display leading-tight tracking-[0.04em] ${compact ? "text-[32px]" : "text-[38px]"}`}>{section.title}</h2><p className={`mt-2 font-body italic text-marbleDim ${compact ? "text-[17px]" : "text-xl"}`}>{section.detail}</p></div>
                  <p className="font-ui text-xs uppercase tracking-[0.18em] text-marbleDim">Tap to open <span aria-hidden="true">↗</span></p>
                </div>
              </Tile>
            ))}
          </Swap>
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => swap.current?.prev()} aria-label="Previous section" className="grid h-11 w-11 place-items-center rounded-full border border-marble/60 text-xl text-marble hover:bg-marble/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marble">←</button>
          <Link href={sections[index].href} prefetch={false} className="rounded-full bg-marble px-5 py-3 font-ui text-sm text-wine focus-visible:outline focus-visible:outline-2 focus-visible:outline-marble focus-visible:outline-offset-4">Open {sections[index].title}</Link>
          <button type="button" onClick={() => swap.current?.next()} aria-label="Next section" className="grid h-11 w-11 place-items-center rounded-full border border-marble/60 text-xl text-marble hover:bg-marble/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-marble">→</button>
        </div>
        <p className="mt-3 text-center font-ui text-xs text-marbleDim">Swipe the cards or use the arrows to explore.</p>
      </section>
      <nav aria-label="Your world" className="grid content-center gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} prefetch={false} className="group flex min-h-[68px] items-center gap-4 border-b border-marble/20 py-3 outline-none transition-colors hover:border-marble focus-visible:ring-2 focus-visible:ring-marble motion-reduce:transition-none">
            <span aria-hidden="true" className="font-ui text-xs tracking-[0.12em] text-marbleDim/75">{section.number}</span>
            <span className="min-w-0 flex-1"><span className="block font-display text-[22px] tracking-[0.04em] text-marble">{section.title}</span><span className="block font-body text-[16px] leading-snug text-marbleDim">{section.detail}</span></span>
            <span aria-hidden="true" className="font-body text-xl text-marbleDim transition-transform group-hover:translate-x-1 motion-reduce:transform-none">↗</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
