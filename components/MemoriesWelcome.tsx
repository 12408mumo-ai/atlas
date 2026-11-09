"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import type { MemoryEntry } from "@/lib/memories";

const BounceCards = lazy(() => import("@/components/BounceCards")) as ComponentType<{
  images: { src: string; alt: string }[]; containerWidth: number; containerHeight: number;
  cardSize: number; spread: number; rotation: number; arc: number; pushDistance: number;
  borderWidth: number; borderColor: string; radius: number; animationDelay: number;
}>;

const samplePhotos = [
  { src: "/assets/memories/kilifi-coast.jpg", alt: "Sample photograph of the coast" },
  { src: "/assets/optimized/jacaranda-walk.webp", alt: "Sample photograph of a jacaranda walk" },
  { src: "/assets/memories/athens-columns.jpg", alt: "Sample photograph of ancient columns" },
  { src: "/assets/memories/family-dinner.jpg", alt: "Sample photograph of a family dinner" },
  { src: "/assets/memories/studio-desk.jpg", alt: "Sample photograph of a studio desk" },
];

export function MemoriesWelcome({ entries, onNext, onBack }: { entries: MemoryEntry[]; onNext: () => void; onBack: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);
  const photos = useMemo(() => {
    const seen = new Set<string>();
    const images: { src: string; alt: string }[] = [];
    for (const entry of entries) {
      for (const item of [entry.media, ...(entry.mediaAttachments || [])]) {
        if (!item || item.mediaType !== "photo" || !item.src || seen.has(item.src)) continue;
        seen.add(item.src);
        images.push({ src: item.src === "/assets/memories/jacaranda-walk.jpg" ? "/assets/optimized/jacaranda-walk.webp" : item.src, alt: entry.title || "Memory photo" });
        if (images.length === 5) return images;
      }
    }
    return images;
  }, [entries]);
  const images = photos.length ? photos : samplePhotos;

  useEffect(() => {
    const node = area.current;
    if (!node) return;
    const resize = () => setWidth(Math.max(1, Math.min(600, node.clientWidth)));
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    resize();
    return () => observer.disconnect();
  }, []);

  const size = Math.min(210, Math.max(100, width * 0.42));
  const spread = images.length > 1 ? Math.min(88, Math.max(0, (width - size - 32) / (images.length - 1))) : 0;

  return (
    <main className="glass-page flex min-h-[100svh] w-full flex-col items-center justify-center overflow-hidden px-6 py-10 text-center text-wine">
      <p className="font-ui text-xs uppercase tracking-[0.35em] text-wine/75">The world you carry</p>
      <h1 className="mt-3 font-display text-[clamp(38px,8vw,68px)] tracking-[0.08em]">Memories</h1>
      <p className="mt-2 max-w-md font-body text-xl italic text-wine/80">The moments, people, and places worth keeping.</p>
      <div className="mt-4 w-full max-w-[600px] pl-14 sm:pl-0">
        <div ref={area} className="relative w-full" aria-label={photos.length ? "A selection of your memory photos" : "Sample photos"}>
          <Suspense fallback={<div className="h-[250px]" />}>
            <BounceCards images={images} containerWidth={width} containerHeight={Math.max(245, size + 75)} cardSize={size} spread={spread} rotation={9} arc={15} pushDistance={Math.min(95, size * 0.5)} borderWidth={4} borderColor="#eee9d9" radius={18} animationDelay={0.1} />
          </Suspense>
        </div>
      </div>
      <p className="mt-1 min-h-6 font-ui text-xs uppercase tracking-[0.14em] text-wine/70">{photos.length ? "A glimpse of your memories" : "Sample photos · add your own in Gallery"}</p>
      <button type="button" onClick={onNext} className="btn-wine mt-6 min-w-[190px]">Next <span aria-hidden="true">→</span></button>
      <button type="button" onClick={onBack} className="mt-5 font-ui text-sm uppercase tracking-[0.15em] text-wine underline underline-offset-4">Back to Atlas</button>
    </main>
  );
}
