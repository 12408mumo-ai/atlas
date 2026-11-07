/* ================================================================== */
/*  RibbonSphere — the opening orb of Atlas                           */
/*                                                                     */
/*  Thousands of strands are carried around a sphere by a flow that   */
/*  braids them into long S-curves. Together they weave the form: a  */
/*  magenta crescent across the upper left, a blue sweep through the  */
/*  right and the bottom, teal bands running through the middle, and  */
/*  a spray of small particles off the left edge.                      */
/*                                                                     */
/*  The colour of a strand comes from where it sits, so the bands      */
/*  form out of the same flow. The strands drift and breathe on their */
/*  own, so the form is always alive.                                 */
/* ================================================================== */

"use client";

import { useEffect, useRef } from "react";

/* The palette, taken from the reference image. */
const MAGENTA = [233, 47, 225];
const MAGENTA_HOT = [243, 84, 240];
const BLUE = [22, 97, 226];
const BLUE_HOT = [85, 170, 228];
const TEAL = [54, 163, 206];
const TEAL_SOFT = [85, 154, 169];

/** A smooth 0 to 1 ramp between two edges. */
function smooth(edge0: number, edge1: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * The colour of a point, blended from where it sits on the form.
 *
 * The bands are read off the screen, not off longitude: the reference
 * paints a magenta crescent across the upper left, a blue sweep through
 * the lower right, and teal everywhere the two do not reach. Each band
 * fades in over the others, so the colours weave into one another
 * instead of meeting at a hard edge.
 *
 * @param nx the point's x on the form, -1 to 1
 * @param ny the point's y on the form, -1 to 1
 */
function colourAt(nx: number, ny: number) {
  // How magenta the point is: the upper left, hugging the rim.
  const mag =
    smooth(0.02, 0.4, ny) *
    smooth(0.16, -0.16, nx) *
    smooth(-0.62, -0.1, nx * 0.55 + ny * 0.85) *
    smooth(1.12, 0.86, Math.hypot(nx + 0.06, ny - 0.28));

  // How blue the point is: the lower right, the right, and the bottom.
  const blu =
    smooth(0.3, 0.02, ny) *
    smooth(-0.14, 0.14, nx) *
    smooth(-0.6, -0.16, nx * 0.5 - ny * 0.72);

  const magW = Math.min(1, mag * 1.5);
  const bluW = Math.min(1, blu * 1.5) * (1 - magW);
  const teaW = Math.max(0, 1 - magW - bluW);

  // Mix the three palettes together.
  const mix = (a: number[], b: number[], c: number[]) => [
    Math.round(a[0] * magW + b[0] * bluW + c[0] * teaW),
    Math.round(a[1] * magW + b[1] * bluW + c[1] * teaW),
    Math.round(a[2] * magW + b[2] * bluW + c[2] * teaW),
  ];

  return {
    colour: mix(MAGENTA, BLUE, TEAL),
    hot: mix(MAGENTA_HOT, BLUE_HOT, TEAL_SOFT),
    weight: 1.2 + magW * 1.4 + bluW * 1.2,
  };
}

export function RibbonSphere({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LOGICAL = 460;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL * DPR;
    canvas.height = LOGICAL * DPR;

    const R = LOGICAL * 0.31;
    const cx = LOGICAL / 2;
    const cy = LOGICAL / 2;

    /* ---- the strands ---- */
    const STRANDS = 1500;
    const STEPS = 80;
    type Strand = {
      lon: number;
      lat: number;
      radius: number;
      phase: number;
      turns: number;
      amp: number;
      speed: number;
      bold: boolean;
    };

    const strands: Strand[] = [];
    for (let s = 0; s < STRANDS; s++) {
      const f = s / STRANDS;
      // Spread the strands over the whole form with a Fibonacci spiral,
      // so the weave covers every part of the sphere.
      const y = 1 - f * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = f * Math.PI * 2 * 7 + s * 0.11;
      const startLat = Math.asin(y);
      const startLon = Math.atan2(Math.sin(theta) * rad, Math.cos(theta) * rad);
      strands.push({
        lon: startLon,
        lat: startLat,
        radius: 0.62 + (((s * 17) % 100) / 100) * 0.44,
        phase: (s * 0.618034) % (Math.PI * 2),
        turns: 1.4 + (((s * 7) % 100) / 100) * 1.2,
        amp: 0.3 + (((s * 13) % 100) / 100) * 0.26,
        speed: 0.03 + (((s * 23) % 100) / 100) * 0.05,
        // A few strands are the bold arcs of the reference.
        bold: s % 11 === 0,
      });
    }

    /* ---- the spray of particles on the left ---- */
    const DOTS = 340;
    const dots: { ang: number; rad: number; size: number; bright: number }[] = [];
    for (let i = 0; i < DOTS; i++) {
      const f = i / DOTS;
      dots.push({
        ang: ((135 + f * 105 + Math.sin(i * 0.7) * 18) * Math.PI) / 180,
        rad: 0.7 + (((i * 17) % 100) / 100) * 0.5,
        size: 0.4 + (((i * 29) % 100) / 100) * 1.2,
        bright: ((i * 11) % 100) / 100,
      });
    }

    let raf = 0;
    const t0 = performance.now();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = (now: number) => {
      const t = now / 1000;
      const w = LOGICAL;
      const h = LOGICAL;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);


      /* ---- the deep field ---- */
      // The orb carries its own night-blue ground so the ribbon colours
      // read true, while the page around it stays the app's charcoal.
      const ground = ctx.createRadialGradient(
        cx, cy, R * 0.05, cx, cy, R * 1.62
      );
      ground.addColorStop(0, "rgba(12, 38, 82, 0.95)");
      ground.addColorStop(0.62, "rgba(6, 26, 60, 0.85)");
      ground.addColorStop(1, "rgba(3, 18, 46, 0)");
      ctx.fillStyle = ground;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.62, 0, Math.PI * 2);
      ctx.fill();

      /* ---- the strands ---- */
      ctx.lineCap = "round";

      for (const s of strands) {
        let lon = s.lon + t * s.speed;
        let lat = s.lat;
        const radius = s.radius;
        const speed = s.speed;

        // Draw the strand as short pieces, fading it where it goes
        // behind the centre. One continuous stroke would leave a seam.
        let px = 0;
        let py = 0;
        let prevValid = false;
        let prevAlpha = 0;
        let prevWeight = 0;

        for (let i = 0; i <= STEPS; i++) {
          const u = i / STEPS;
          const nlat = lat + Math.sin(lon * s.turns + s.phase + t * speed * 4) * s.amp;
          const nlon = lon + 0.055 + speed * 0.02;
          let nrad = radius * (1 + Math.sin(u * Math.PI * 2 + s.phase) * 0.26);

          const x = Math.cos(nlon) * Math.cos(nlat) * nrad;
          const y = Math.sin(nlat) * nrad;
          const z = Math.cos(nlon) * Math.sin(nlat) * nrad;

          const sx = cx + x * R;
          const sy = cy - y * R;

          // The colour follows where the point sits on the form.
          const band = colourAt(x, y);
          const heat = 0.5 + 0.5 * Math.sin(u * Math.PI);
          const rgb = heat > 0.86 ? band.hot : band.colour;
          const key = rgb.join(",");
          const alpha = (0.14 + heat * 0.32) + (s.bold ? 0.3 : 0);
          const lineW = band.weight + (s.bold ? 2.4 : 0);

          if (z >= -0.06) {
            // Fade in from the back so there is no hard edge.
            const fade = Math.min(1, Math.max(0, (z + 0.06) / 0.5));
            if (prevValid) {
              ctx.beginPath();
              ctx.moveTo(px, py);
              ctx.lineTo(sx, sy);
              ctx.strokeStyle = `rgba(${key}, ${(
                prevAlpha * (0.08 + 0.92 * fade)
              ).toFixed(3)})`;
              ctx.lineWidth = prevWeight * (0.5 + 0.5 * fade);
              ctx.stroke();
            }
            prevValid = true;
            prevAlpha = alpha;
            prevWeight = lineW;
          } else {
            prevValid = false;
          }

          px = sx;
          py = sy;
          lon = nlon;
          lat = nlat;
        }
      }

      /* ---- the spray of particles ---- */
      for (const d of dots) {
        const sx = cx + Math.cos(d.ang) * d.rad * R;
        const sy = cy + Math.sin(d.ang) * d.rad * R;
        const alpha = 0.5 * (0.3 + d.bright * 0.7) * 0.85;
        ctx.beginPath();
        ctx.arc(sx, sy, d.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${TEAL_SOFT.join(",")}, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      if (!reducedMotion) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full ${className}`}
      aria-hidden="true"
    />
  );
}

export default RibbonSphere;
