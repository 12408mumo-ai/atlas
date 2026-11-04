"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/* ------------------------------------------------------------------ */
/*  The Stage: Atlas kneels with the celestial sphere. Five pillars    */
/*  orbit it as living bodies. Each body is a doorway.                 */
/* ------------------------------------------------------------------ */

export type Pillar = {
  key: string;
  name: string;
  greek: string;
  glyph: JSX.Element;
  href: string;
  hue: string;
  blurb: string;
  orbit: { radius: number; tilt: number; speed: number; phase: number; lift: number };
  count: string;
};

const glyph = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" className="h-full w-full">
    <path d={d} />
  </svg>
);

export const PILLARS: Pillar[] = [
  {
    key: "work",
    name: "Work",
    greek: "Ἔργον",
    glyph: glyph("M4 8.5h16M6.5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h8a1.5 1.5 0 0 0 1.5-1.5V8.5M9 8.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v2.5"),
    href: "/work",
    hue: "#e2b563",
    blurb: "Client projects, tasks, time, income and your own ventures.",
    orbit: { radius: 1.42, tilt: -16, speed: 60, phase: 0.35, lift: 0.05 },
    count: "3 projects",
  },
  {
    key: "study",
    name: "Study",
    greek: "Μάθησις",
    glyph: glyph("M3 7.5 12 4l9 3.5-9 3.5-9-3.5Zm3 3.2V16c0 1.6 2.7 3 6 3s6-1.4 6-3v-5.3M21 7.5V14"),
    href: "/study",
    hue: "#8fb3c9",
    blurb: "Timetable, courses, assignments, exams and self-learning.",
    orbit: { radius: 1.9, tilt: 13, speed: 78, phase: 2.4, lift: -0.85 },
    count: "4 courses",
  },
  {
    key: "people",
    name: "People",
    greek: "Ἄνθρωποι",
    glyph: glyph("M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Zm8 9v-1.6a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4V20M16.5 4.6a3.2 3.2 0 0 1 0 6.3M22 20v-1.6a4 4 0 0 0-3-3.9"),
    href: "/people",
    hue: "#d98f7a",
    blurb: "Everyone who matters — dates, promises, gifts, check-ins.",
    orbit: { radius: 1.66, tilt: 29, speed: 47, phase: 4.2, lift: 1.0 },
    count: "4 souls",
  },
  {
    key: "life",
    name: "Life",
    greek: "Βίος",
    glyph: glyph("M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 8a4.4 4.4 0 0 1 7.5 2.9c0 5-7.5 9.6-7.5 9.6Z"),
    href: "/life",
    hue: "#7fae86",
    blurb: "Health, money, habits and the 1–5 of how you actually feel.",
    orbit: { radius: 2.1, tilt: -31, speed: 69, phase: 5.5, lift: -0.2 },
    count: "4 habits",
  },
  {
    key: "memories",
    name: "Memories",
    greek: "Μνῆμαι",
    glyph: glyph("M12 7.5c-2-2.4-5-2.4-6.5-.6C4 8.8 4.6 12 7 14.4L12 19l5-4.6c2.4-2.4 3-5.6 1.5-7.5C17 5.1 14 5.1 12 7.5Zm0 0V3"),
    href: "/memories",
    hue: "#b79bd6",
    blurb: "Every log, journal and milestone — the timeline of you.",
    orbit: { radius: 2.36, tilt: 5, speed: 92, phase: 1.2, lift: 1.75 },
    count: "this day",
  },
];

/** geometry of the globe inside atlas-hero.png (fractions of image size) */
const GLOBE = { cx: 0.5078, cy: 0.2507, r: 0.306 };
/** how flat the orbital rings are drawn (vertical squash) */
const ORBIT_SKEW = 0.36;
const IMG_AR = 768 / 1376;

type Geo = {
  cx: number;
  cy: number;
  r: number;
  w: number;
  h: number;
  scale: number;
};

export default function AtlasStage() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
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
    const cx = ir.left - wr.left + GLOBE.cx * ir.width;
    const cy = ir.top - wr.top + GLOBE.cy * ir.height;
    const r = GLOBE.r * ir.width;
    setGeo({ cx, cy, r, w: wr.width, h: wr.height, scale: ir.width / 768 });
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

  /* ---- orbit geometry: each ring gets a centre, a radius and a skew ---- */
  const orbits = useMemo(() => {
    if (!geo) return null;
    const maxRx = Math.min(geo.cx, geo.w - geo.cx) - 54;
    const topRoom = 92;
    const bottomRoom = 84;
    return PILLARS.map((p) => {
      const oy = geo.cy + p.orbit.lift * geo.r;
      const want = p.orbit.radius * geo.r;
      const roomUp = Math.max(40, oy - topRoom);
      const roomDown = Math.max(40, geo.h - bottomRoom - oy);
      const rx = Math.max(
        60,
        Math.min(want, maxRx, roomUp / ORBIT_SKEW, roomDown / ORBIT_SKEW)
      );
      return { key: p.key, rx, ry: rx * ORBIT_SKEW, oy };
    });
  }, [geo]);

  const open = useCallback(
    (p: Pillar) => {
      setOpening(p);
      // a short breath of light, then the doorway takes you
      window.setTimeout(() => router.push(p.href), 460);
    },
    [router]
  );

  const ringFor = useCallback(
    (key: string) => orbits?.find((o) => o.key === key),
    [orbits]
  );

  /* ---- static rings on canvas ---- */
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
      const ring = ringFor(p.key);
      if (!ring) return;
      const tilt = (p.orbit.tilt * Math.PI) / 180;

      const grad = ctx.createLinearGradient(geo.cx - ring.rx, ring.oy - ring.ry, geo.cx + ring.rx, ring.oy + ring.ry);
      grad.addColorStop(0, hexA(p.hue, 0));
      grad.addColorStop(0.5, hexA(p.hue, 0.07));
      grad.addColorStop(1, hexA(p.hue, 0));

      ctx.save();
      ctx.translate(geo.cx, ring.oy);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = hexA(p.hue, 0.28);
      ctx.setLineDash([2, 8]);
      ctx.stroke();
      ctx.restore();
    });
  }, [geo, orbits, ringFor]);

  /* ---- animation loop: move the spheres through the DOM ---- */
  useEffect(() => {
    if (!geo || !orbits) return;
    let raf = 0;
    t0.current = performance.now();
    const tick = (now: number) => {
      const t = (now - t0.current) / 1000;
      PILLARS.forEach((p, i) => {
        const ring = ringFor(p.key);
        if (!ring) return;
        const tilt = (p.orbit.tilt * Math.PI) / 180;
        const speed = 360 / p.orbit.speed;
        const a = ((p.orbit.phase * 22 + t * speed) * Math.PI) / 180;
        const ex = ring.rx * Math.cos(a);
        const ey = ring.ry * Math.sin(a);
        const x = geo.cx + ex * Math.cos(tilt) - ey * Math.sin(tilt);
        const y = ring.oy + ex * Math.sin(tilt) + ey * Math.cos(tilt);
        const depth = Math.sin(a); // −1 behind, +1 in front
        const scale = 0.8 + (depth + 1) * 0.14;
        const el = sphereRefs.current[i];
        if (el) {
          el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${(intro ? 1 : 0.2) * scale})`;
          el.style.opacity = String(intro ? 0.58 + (depth + 1) * 0.21 : 0);
          el.style.zIndex = String(100 + Math.round(depth * 40));
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [geo, orbits, intro, ringFor]);

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative mx-auto h-[76svh] min-h-[520px] w-full max-w-[1180px] overflow-hidden sm:h-[86svh] sm:min-h-[640px]"
      >
        {/* atmosphere: the same world, blurred far behind */}
        <div
          className="absolute inset-0 scale-110 opacity-60"
          style={{
            backgroundImage: "url(/assets/atlas-hero.png)",
            backgroundSize: "cover",
            backgroundPosition: "center 18%",
            filter: "blur(22px) saturate(.85) brightness(.62)",
          }}
          aria-hidden
        />
        {/* the Titan, held sharp and centred */}
        <div className="absolute inset-0 grid place-items-center">
          <img
            ref={imgRef}
            src="/assets/atlas-hero.png"
            alt="A marble Atlas kneeling, holding a glowing celestial sphere"
            onLoad={measure}
            className="h-full w-auto max-w-none select-none object-contain"
            style={{ filter: "drop-shadow(0 40px 80px rgba(0,0,0,.9))" }}
            draggable={false}
          />
        </div>
        {/* vignettes */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(72% 58% at 50% 26%, transparent 12%, rgba(7,10,16,.5) 58%, rgba(7,10,16,.95) 100%)" }} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-night/90 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-night via-night/70 to-transparent" />

        {/* rings */}
        <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />

        {/* the world's aura */}
        {geo && (
          <>
            <div
              className="pointer-events-none absolute rounded-full anim-breathe"
              style={{
                left: geo.cx,
                top: geo.cy,
                width: geo.r * 2.9,
                height: geo.r * 2.9,
                transform: "translate(-50%,-50%)",
                background:
                  "radial-gradient(closest-side, rgba(243,215,154,.30), rgba(226,181,99,.12) 46%, transparent 72%)",
                mixBlendMode: "screen",
                zIndex: 50,
              }}
            />
            <div
              className="pointer-events-none absolute rounded-full"
              style={{
                left: geo.cx,
                top: geo.cy,
                width: geo.r * 2.06,
                height: geo.r * 2.06,
                transform: "translate(-50%,-50%)",
                border: "1px solid rgba(243,215,154,.28)",
                boxShadow: "0 0 60px rgba(226,181,99,.25), inset 0 0 50px rgba(226,181,99,.12)",
                zIndex: 300,
              }}
            />
          </>
        )}

        {/* pillar spheres */}
        <div className="absolute inset-0" style={{ zIndex: 60 }}>
          {PILLARS.map((p, i) => (
            <div
              key={p.key}
              ref={(el) => {
                sphereRefs.current[i] = el;
              }}
              className="absolute left-0 top-0 will-change-transform"
              style={{ opacity: 0 }}
            >
              <button
                onClick={() => open(p)}
                onMouseEnter={() => setHovered(p.key)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(p.key)}
                onBlur={() => setHovered(null)}
                aria-label={`${p.name} — ${p.blurb}`}
                className="group relative block h-[74px] w-[74px] rounded-full outline-none sm:h-[88px] sm:w-[88px] focus-visible:ring-2 focus-visible:ring-goldBright/70"
              >
                {/* halo */}
                <span
                  className="pointer-events-none absolute -inset-4 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: `radial-gradient(closest-side, ${hexA(p.hue, 0.45)}, transparent 70%)`, filter: "blur(8px)" }}
                />
                {/* body */}
                <span
                  className="relative grid h-full w-full place-items-center rounded-full transition-transform duration-500 group-hover:scale-[1.07]"
                  style={{
                    background: `radial-gradient(circle at 32% 26%, ${hexA(p.hue, 0.95)}, ${hexA(p.hue, 0.5)} 42%, rgba(11,17,25,.96) 78%)`,
                    boxShadow: `inset -10px -14px 26px rgba(0,0,0,.72), inset 8px 8px 20px ${hexA(p.hue, 0.28)}, 0 0 26px ${hexA(p.hue, 0.3)}, 0 14px 30px -12px rgba(0,0,0,.9)`,
                    border: `1px solid ${hexA(p.hue, 0.55)}`,
                  }}
                >
                  {/* meridian shimmer */}
                  <span className="pointer-events-none absolute inset-[7px] rounded-full opacity-45"
                    style={{ border: `1px solid ${hexA("#ffffff", 0.16)}` }} />
                  <span className="relative h-[30%] w-[30%]" style={{ color: p.hue }}>
                    {p.glyph}
                  </span>
                </span>
                {/* label */}
                <span
                  className={`pointer-events-none absolute left-1/2 top-[calc(100%+9px)] -translate-x-1/2 whitespace-nowrap font-ui text-[9px] uppercase tracking-[.34em] transition-all duration-300 ${
                    hovered === p.key ? "text-goldBright" : "text-marble/60"
                  }`}
                  style={{ textShadow: "0 2px 10px rgba(0,0,0,.95)" }}
                >
                  {p.name}
                </span>
              </button>
            </div>
          ))}
        </div>

        {/* floating caption */}
        <div className="pointer-events-none absolute inset-x-0 bottom-6 z-[400] text-center">
          <p className="font-ui text-[9px] uppercase tracking-[.42em] text-marble/40">
            {hovered ? PILLARS.find((p) => p.key === hovered)?.blurb : "The world you carry · touch a sphere to open it"}
          </p>
        </div>
      </div>

      {/* the doorway */}
      {opening && (
        <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center anim-fade">
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(circle at 50% 50%, ${hexA(opening.hue, 0.42)}, rgba(7,10,16,.92) 62%)` }}
          />
          <div className="relative text-center">
            <p className="font-display text-[clamp(28px,6vw,58px)] tracking-[.22em]" style={{ color: opening.hue, textShadow: `0 0 40px ${hexA(opening.hue, 0.6)}` }}>
              {opening.name.toUpperCase()}
            </p>
            <p className="mt-2 font-body text-[13px] italic tracking-[.2em] text-marble/50">{opening.greek}</p>
          </div>
        </div>
      )}

      {/* keyboard / mobile access, always visible */}
      <div className="mx-auto mt-2 grid max-w-[1180px] grid-cols-2 gap-2 px-1 sm:grid-cols-5">
        {PILLARS.map((p) => (
          <button
            key={p.key}
            onClick={() => open(p)}
            onMouseEnter={() => setHovered(p.key)}
            onMouseLeave={() => setHovered(null)}
            className="group flex items-center gap-3 border border-gold/15 bg-white/[.02] px-4 py-3 text-left transition-all duration-300 hover:border-gold/45 hover:bg-gold/[.06]"
          >
            <span className="h-4 w-4 shrink-0" style={{ color: p.hue }}>{p.glyph}</span>
            <span className="min-w-0">
              <span className="block font-ui text-[10px] uppercase tracking-[.26em] text-marble/80 group-hover:text-goldBright transition">
                {p.name}
              </span>
              <span className="block truncate font-body text-[11px] italic text-marble/35">{p.greek}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function hexA(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}
