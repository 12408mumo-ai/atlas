"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  The Stage — flat two-colour edition                               */
/*  Atlas kneels with the world above him. Five pillar spheres orbit  */
/*  it; each sphere carries its own emblem image and opens a page.    */
/* ------------------------------------------------------------------ */

export type Pillar = {
  key: string;
  name: string;
  greek: string;
  href: string;
  image: string;
  blurb: string;
  count: string;
  orbit: { radius: number; tilt: number; speed: number; phase: number; lift: number };
};

export const PILLARS: Pillar[] = [
  {
    key: "work",
    name: "Work",
    greek: "Ἔργον",
    href: "/work",
    image: "/assets/emblems/work.png",
    blurb: "Client projects, tasks, time, income and your own ventures.",
    count: "3 projects",
    orbit: { radius: 1.42, tilt: -16, speed: 60, phase: 0.35, lift: 0.05 },
  },
  {
    key: "study",
    name: "Study",
    greek: "Μάθησις",
    href: "/study",
    image: "/assets/emblems/study.png",
    blurb: "Timetable, courses, assignments, exams and self-learning.",
    count: "4 courses",
    orbit: { radius: 1.9, tilt: 13, speed: 78, phase: 2.4, lift: -0.85 },
  },
  {
    key: "people",
    name: "People",
    greek: "Ἄνθρωποι",
    href: "/people",
    image: "/assets/emblems/people.png",
    blurb: "Everyone who matters — dates, promises, gifts, check-ins.",
    count: "4 souls",
    orbit: { radius: 1.66, tilt: 29, speed: 47, phase: 4.2, lift: 1.0 },
  },
  {
    key: "life",
    name: "Life",
    greek: "Βίος",
    href: "/life",
    image: "/assets/emblems/life.png",
    blurb: "Health, money, habits and the 1–5 of how you actually feel.",
    count: "4 habits",
    orbit: { radius: 2.1, tilt: -31, speed: 69, phase: 5.5, lift: -0.2 },
  },
  {
    key: "memories",
    name: "Memories",
    greek: "Μνῆμαι",
    href: "/memories",
    image: "/assets/emblems/memories.png",
    blurb: "Every log, journal and milestone — the timeline of you.",
    count: "this day",
    orbit: { radius: 2.36, tilt: 5, speed: 92, phase: 1.2, lift: 1.75 },
  },
];

/** the warm-cream sphere inside atlas-flat.png, as fractions of the image box */
const WORLD = { cx: 0.4993, cy: 0.2827, r: 0.2715 };
/** how flat the orbital rings are drawn */
const ORBIT_SKEW = 0.36;

type Geo = { cx: number; cy: number; r: number; w: number; h: number };

export default function AtlasStage() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sphereRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [geo, setGeo] = useState<Geo | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [intro, setIntro] = useState(false);
  const [opening, setOpening] = useState<Pillar | null>(null);
  const t0 = useRef<number>(0);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const img = imgRef.current;
    if (!wrap || !img) return;
    const wr = wrap.getBoundingClientRect();
    const ir = img.getBoundingClientRect();
    if (!ir.width) return;
    setGeo({
      cx: ir.left - wr.left + WORLD.cx * ir.width,
      cy: ir.top - wr.top + WORLD.cy * ir.height,
      r: WORLD.r * ir.width,
      w: wr.width,
      h: wr.height,
    });
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      measure();
      setIntro(true);
    });
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(id);
    };
  }, [measure]);

  const orbits = useMemo(() => {
    if (!geo) return null;
    const maxRx = Math.min(geo.cx, geo.w - geo.cx) - 64;
    return PILLARS.map((p) => {
      const oy = geo.cy + p.orbit.lift * geo.r;
      const roomUp = Math.max(52, oy - 86);
      const roomDown = Math.max(52, geo.h - 86 - oy);
      const rx = Math.max(60, Math.min(p.orbit.radius * geo.r, maxRx, roomUp / ORBIT_SKEW, roomDown / ORBIT_SKEW));
      return { key: p.key, rx, ry: rx * ORBIT_SKEW, oy };
    });
  }, [geo]);

  const open = useCallback(
    (p: Pillar) => {
      setOpening(p);
      window.setTimeout(() => router.push(p.href), 380);
    },
    [router]
  );

  /* ---- flat rings ---- */
  useEffect(() => {
    if (!geo || !canvasRef.current || !orbits) return;
    const canvas = canvasRef.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, geo.w * dpr);
    canvas.height = Math.max(1, geo.h * dpr);
    canvas.style.width = `${geo.w}px`;
    canvas.style.height = `${geo.h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, geo.w, geo.h);

    PILLARS.forEach((p) => {
      const ring = orbits.find((o) => o.key === p.key);
      if (!ring) return;
      ctx.save();
      ctx.translate(geo.cx, ring.oy);
      ctx.rotate((p.orbit.tilt * Math.PI) / 180);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle =
        p.key === "people" || p.key === "life"
          ? "rgba(245, 232, 211, 0.30)"
          : "rgba(245, 232, 211, 0.56)";
      ctx.stroke();
      ctx.restore();
    });
  }, [geo, orbits]);

  /* ---- motion: spheres ride their rings ---- */
  useEffect(() => {
    if (!geo || !orbits) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (now: number) => {
      const t = (now - t0.current) / 1000;
      PILLARS.forEach((p, i) => {
        const ring = orbits.find((o) => o.key === p.key);
        const el = sphereRefs.current[i];
        if (!ring || !el) return;
        const tilt = (p.orbit.tilt * Math.PI) / 180;
        const a = ((p.orbit.phase * 22 + t * (360 / p.orbit.speed)) * Math.PI) / 180;
        const ex = ring.rx * Math.cos(a);
        const ey = ring.ry * Math.sin(a);
        const x = geo.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
        const y = ring.oy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
        const depth = Math.sin(a); // −1 behind, +1 in front
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${intro ? 1 : 0.2})`;
        el.style.opacity = intro ? "1" : "0";
        el.style.zIndex = String(100 + Math.round(depth * 40));
        // spheres behind the world are sunk: smaller, dimmed with a flat veil
        const veil = el.querySelector<HTMLElement>("[data-veil]");
        if (veil) veil.style.opacity = String(0.35 - depth * 0.3);
        el.style.width = el.style.height = `${84 + depth * 9}px`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, orbits, intro]);

  return (
    <div className="relative px-4 sm:px-6">
      <div
        ref={wrapRef}
        className="relative mx-auto h-[74svh] min-h-[540px] w-full max-w-[1180px] overflow-hidden rounded-[20px] border-[3px] border-wine bg-wine sm:h-[84svh] sm:min-h-[660px]"
      >
        {/* the Titan, flat and full-bleed */}
        <div className="absolute inset-0 grid place-items-center">
          <img
            ref={imgRef}
            src="/assets/atlas-flat.png"
            alt="Flat illustration of Atlas kneeling, holding the world above him"
            onLoad={measure}
            className="h-full w-auto max-w-none select-none object-contain"
            draggable={false}
          />
        </div>

        {/* rings */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />

        {/* the five spheres */}
        <div className="absolute inset-0">
          {PILLARS.map((p, i) => (
            <div
              key={p.key}
              ref={(el) => {
                sphereRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 h-[84px] w-[84px] will-change-transform"
              style={{ opacity: 0 }}
            >
              <button
                onClick={() => open(p)}
                onMouseEnter={() => setHovered(p.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.key)}
                onBlur={() => setHovered(null)}
                aria-label={`${p.name} — ${p.blurb}`}
                className="group relative block h-full w-full rounded-full border-[3px] border-marble bg-marble outline-none focus-visible:ring-4 focus-visible:ring-marble"
              >
                <span className="absolute inset-[3px] overflow-hidden rounded-full">
                  <img
                    src={p.image}
                    alt=""
                    className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-[1.2]"
                    draggable={false}
                  />
                  {/* flat charcoal veil for depth behind the world */}
                  <span data-veil className="pointer-events-none absolute inset-0 bg-wine" style={{ opacity: 0.3 }} />
                </span>
                {/* name plate under the sphere */}
                <span className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 whitespace-nowrap rounded-pill border-2 border-wine bg-marble px-3.5 py-1 font-ui text-[16.5px] uppercase tracking-[0.16em] text-wine">
                  {p.name}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* flat caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-[400] px-4 text-center">
          <p className="inline-block rounded-pill border-2 border-marble bg-wine px-5 py-2 font-ui text-[17px] uppercase tracking-[0.18em] text-marble">
            {hovered ? PILLARS.find((p) => p.key === hovered)?.blurb : "Touch a sphere to open it"}
          </p>
        </div>
      </div>

      {/* accessible doorway list */}
      <div className="mx-auto mt-3.5 grid max-w-[1180px] grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
        {PILLARS.map((p) => (
          <button
            key={p.key}
            onClick={() => open(p)}
            onMouseEnter={() => setHovered(p.key)}
            onMouseLeave={() => setHovered(null)}
            className="group flex items-center gap-3 rounded-pill border-2 border-wine bg-marble px-4 py-3 text-left transition-colors hover:bg-wine"
          >
            <span className="h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-wine group-hover:border-marble">
              <img src={p.image} alt="" className="h-full w-full object-cover" draggable={false} />
            </span>
            <span className="min-w-0">
              <span className="block font-ui text-[18px] uppercase tracking-[0.16em] text-wine group-hover:text-marble">{p.name}</span>
              <span className="block truncate font-body text-[18.5px] italic text-wine opacity-65 group-hover:text-marble group-hover:opacity-80">
                {p.greek}
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* doorway flash */}
      {opening && (
        <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center anim-fade bg-wine/95">
          <div className="text-center">
            <img src={opening.image} alt="" className="mx-auto h-28 w-28 rounded-full border-[3px] border-marble object-cover" />
            <p className="mt-5 font-display text-[clamp(34px,6.8vw,64px)] tracking-[0.2em] text-marble">
              {opening.name.toUpperCase()}
            </p>
            <p className="mt-2 font-body text-[21px] italic tracking-[0.18em] text-marble opacity-75">{opening.greek}</p>
          </div>
        </div>
      )}
    </div>
  );
}
