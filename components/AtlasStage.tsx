"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  AtlasStage — full-viewport sanctuary                              */
/*  Nothing else on the screen: only the god Atlas carrying the       */
/*  world and the spinning spheres moving around it. Press a sphere   */
/*  and its doorway opens.                                            */
/* ------------------------------------------------------------------ */

export type Pillar = {
  key: string;
  name: string;
  greek: string;
  href: string;
  image: string;
  blurb: string;
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
    orbit: { radius: 1.48, tilt: -17, speed: 54, phase: 0.35, lift: 0.06 },
  },
  {
    key: "study",
    name: "Study",
    greek: "Μάθησις",
    href: "/study",
    image: "/assets/emblems/study.png",
    blurb: "Timetable, courses, assignments, exams and self-learning.",
    orbit: { radius: 1.94, tilt: 14, speed: 70, phase: 2.35, lift: -0.78 },
  },
  {
    key: "people",
    name: "People",
    greek: "Ἄνθρωποι",
    href: "/people",
    image: "/assets/emblems/people.png",
    blurb: "Everyone who matters — dates, promises, gifts, check-ins.",
    orbit: { radius: 1.72, tilt: 28, speed: 46, phase: 4.15, lift: 0.96 },
  },
  {
    key: "life",
    name: "Life",
    greek: "Βίος",
    href: "/life",
    image: "/assets/emblems/life.png",
    blurb: "Health, money, habits and the 1–5 of how you actually feel.",
    orbit: { radius: 2.16, tilt: -29, speed: 64, phase: 5.45, lift: -0.18 },
  },
  {
    key: "memories",
    name: "Memories",
    greek: "Μνῆμαι",
    href: "/memories",
    image: "/assets/emblems/memories.png",
    blurb: "Every log, journal and milestone — the timeline of you.",
    orbit: { radius: 2.42, tilt: 6, speed: 82, phase: 1.2, lift: 1.58 },
  },
  {
    key: "atlas",
    name: "Atlas AI",
    greek: "Ὁ Τιτάν",
    href: "/atlas",
    image: "/icons/icon-192.png",
    blurb: "Speak with the Titan AI that weighs and plans your world.",
    orbit: { radius: 1.62, tilt: -8, speed: 50, phase: 3.25, lift: -0.44 },
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
  const hoveredRef = useRef<string | null>(null);
  const [geo, setGeo] = useState<Geo | null>(null);
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
    const edgePad = geo.w < 540 ? 52 : 76;
    const maxRx = Math.max(70, Math.min(geo.cx, geo.w - geo.cx) - edgePad);
    const wideBoost = Math.min(1.38, Math.max(1, geo.w / Math.max(1, geo.r * 5.4)));
    return PILLARS.map((p) => {
      const oy = geo.cy + p.orbit.lift * geo.r;
      const roomUp = Math.max(52, oy - 64);
      const roomDown = Math.max(52, geo.h - 76 - oy);
      const rx = Math.max(
        64,
        Math.min(p.orbit.radius * geo.r * wideBoost, maxRx, roomUp / ORBIT_SKEW, roomDown / ORBIT_SKEW)
      );
      return { key: p.key, rx, ry: rx * ORBIT_SKEW, oy };
    });
  }, [geo]);

  const open = useCallback(
    (p: Pillar) => {
      setOpening(p);
      window.setTimeout(() => router.push(p.href), 360);
    },
    [router]
  );

  /* ---- flat orbital rings ---- */
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
      ctx.lineWidth = 1.8;
      ctx.strokeStyle =
        p.key === "people" || p.key === "life"
          ? "rgba(245, 232, 211, 0.28)"
          : "rgba(245, 232, 211, 0.52)";
      ctx.stroke();
      ctx.restore();
    });
  }, [geo, orbits]);

  /* ---- motion: spheres spin and ride their orbital rings ---- */
  useEffect(() => {
    if (!geo || !orbits) return;
    let raf = 0;
    t0.current = performance.now();
    const baseSize = geo.w < 540 ? 66 : 84;
    const depthSwing = geo.w < 540 ? 6 : 9;

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
        const isHovered = hoveredRef.current === p.key;
        const scale = intro ? (isHovered ? 1.1 : 1) : 0.2;
        el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`;
        el.style.opacity = intro ? "1" : "0";
        el.style.zIndex = String(isHovered ? 300 : 100 + Math.round(depth * 40));

        const veil = el.querySelector<HTMLElement>("[data-veil]");
        if (veil) veil.style.opacity = String(isHovered ? 0 : Math.max(0, 0.34 - depth * 0.3));
        el.style.width = el.style.height = `${baseSize + depth * depthSwing}px`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, orbits, intro]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[100svh] w-screen overflow-hidden bg-wine select-none"
    >
      {/* The god Atlas, kneeling and carrying the world */}
      <div className="absolute inset-0 grid place-items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src="/assets/atlas-flat.png"
          alt="Atlas kneeling, holding the world above him"
          onLoad={measure}
          className="h-[92svh] max-h-[94svh] w-auto max-w-[92vw] select-none object-contain"
          draggable={false}
        />
      </div>

      {/* Clickable celestial world sphere held by Atlas (opens Atlas AI) */}
      {geo && (
        <button
          type="button"
          onClick={() => open(PILLARS.find((p) => p.key === "atlas")!)}
          aria-label="Open Atlas AI"
          style={{
            left: geo.cx,
            top: geo.cy,
            width: geo.r * 2,
            height: geo.r * 2,
          }}
          className="absolute z-[90] -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full outline-none focus-visible:ring-4 focus-visible:ring-marble"
        />
      )}

      {/* Orbital paths */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />

      {/* The spinning spheres moving around the world */}
      <div className="absolute inset-0">
        {PILLARS.map((p, i) => (
          <div
            key={p.key}
            ref={(el) => {
              sphereRefs.current[i] = el;
            }}
            className="absolute left-0 top-0 h-[84px] w-[84px] transition-[transform] duration-75 will-change-transform"
            style={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => open(p)}
              onMouseEnter={() => {
                hoveredRef.current = p.key;
              }}
              onMouseLeave={() => {
                hoveredRef.current = null;
              }}
              onFocus={() => {
                hoveredRef.current = p.key;
              }}
              onBlur={() => {
                hoveredRef.current = null;
              }}
              aria-label={`Open ${p.name}`}
              className="group relative block h-full w-full cursor-pointer rounded-full border-[3px] border-marble bg-marble outline-none focus-visible:ring-4 focus-visible:ring-marble"
            >
              <span className="absolute inset-[3px] overflow-hidden rounded-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image}
                  alt=""
                  className="h-full w-full scale-110 object-cover transition-transform duration-500 group-hover:scale-[1.22]"
                  draggable={false}
                />
                {/* delicate spinning celestial meridian overlay so each orb visibly spins */}
                <svg
                  viewBox="0 0 64 64"
                  className="pointer-events-none absolute inset-0 h-full w-full opacity-45"
                  style={{ animation: `orbitSpin ${14 + i * 2.5}s linear infinite` }}
                  aria-hidden
                >
                  <ellipse cx="32" cy="32" rx="28" ry="11" fill="none" stroke="#28282A" strokeWidth="1.4" />
                  <ellipse cx="32" cy="32" rx="11" ry="28" fill="none" stroke="#28282A" strokeWidth="1.4" />
                </svg>
                {/* flat charcoal veil for depth when behind the world */}
                <span data-veil className="pointer-events-none absolute inset-0 bg-wine" style={{ opacity: 0.3 }} />
              </span>

              {/* Sphere label */}
              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+7px)] -translate-x-1/2 whitespace-nowrap rounded-pill border-2 border-wine bg-marble px-3 py-0.5 font-ui text-[16px] uppercase tracking-[0.14em] text-wine">
                {p.name}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* Doorway transition when a sphere is pressed */}
      {opening && (
        <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center anim-fade bg-wine/95">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
