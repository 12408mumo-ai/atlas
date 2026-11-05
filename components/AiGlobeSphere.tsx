"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  AiGlobeSphere — 3D spinning celestial AI sphere                   */
/*  Strict two-colour rendering (#28282A charcoal + #F5E8D3 cream),   */
/*  front/back depth projection, Fibonacci star nodes & orbital ring. */
/* ------------------------------------------------------------------ */

export function AiGlobeSphere({
  speaking = false,
  onClick,
}: {
  speaking?: boolean;
  onClick?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ tx: 0, ty: 0, cx: 0, cy: 0 });
  const speakingRef = useRef(speaking);
  speakingRef.current = speaking;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const NODES = 200;
    const golden = Math.PI * (3 - Math.sqrt(5));
    const points: [number, number, number][] = [];
    for (let i = 0; i < NODES; i++) {
      const y = 1 - (i / (NODES - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = golden * i;
      points.push([Math.cos(theta) * rad, y, Math.sin(theta) * rad]);
    }

    let raf = 0;
    const t0 = performance.now();

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(box.width * dpr));
      canvas.height = Math.max(1, Math.round(box.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const project = (
      x: number,
      y: number,
      z: number,
      spin: number,
      tiltX: number,
      tiltZ: number
    ): [number, number, number] => {
      const cs = Math.cos(spin);
      const sn = Math.sin(spin);
      const x1 = x * cs + z * sn;
      const y1 = y;
      const z1 = -x * sn + z * cs;

      const cz = Math.cos(tiltZ);
      const sz = Math.sin(tiltZ);
      const x2 = x1 * cz - y1 * sz;
      const y2 = x1 * sz + y1 * cz;
      const z2 = z1;

      const cx = Math.cos(tiltX);
      const sx = Math.sin(tiltX);
      const y3 = y2 * cx - z2 * sx;
      const z3 = y2 * sx + z2 * cx;

      return [x2, y3, z3];
    };

    const drawCurve = (
      pts: [number, number, number][],
      cx: number,
      cy: number,
      R: number,
      frontAlpha: number,
      backAlpha: number,
      lineWidth: number
    ) => {
      for (let pass = 0; pass < 2; pass++) {
        const wantFront = pass === 1;
        ctx.beginPath();
        let penDown = false;
        for (let i = 0; i < pts.length; i++) {
          const [px, py, pz] = pts[i];
          const isFront = pz >= 0;
          if (isFront === wantFront) {
            const sx = cx + px * R;
            const sy = cy - py * R;
            if (!penDown) {
              ctx.moveTo(sx, sy);
              penDown = true;
            } else {
              ctx.lineTo(sx, sy);
            }
          } else {
            penDown = false;
          }
        }
        ctx.strokeStyle = `rgba(245, 232, 211, ${wantFront ? frontAlpha : backAlpha})`;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
      }
    };

    const tick = (now: number) => {
      const dt = (now - t0) / 1000;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      pointer.current.cx += (pointer.current.tx - pointer.current.cx) * 0.06;
      pointer.current.cy += (pointer.current.ty - pointer.current.cy) * 0.06;

      const cx = w / 2;
      const cy = h / 2;
      const isSpeaking = speakingRef.current;
      const voiceMod = isSpeaking
        ? 1 + (Math.sin(dt * 8.5) * 0.025 + Math.sin(dt * 13.2) * 0.015)
        : 1 + Math.sin(dt * 1.6) * 0.012;
      const R = Math.min(w, h) * 0.34 * voiceMod;

      const spin = dt * (isSpeaking ? 0.78 : 0.58) + pointer.current.cx * 0.7;
      const tiltX = 0.28 + pointer.current.cy * 0.32;
      const tiltZ = -0.34;

      // 1. Back half of outer AI orbital ring
      const ringR = R * 1.28;
      const ringPts: [number, number, number][] = [];
      const RING_STEPS = 96;
      for (let i = 0; i <= RING_STEPS; i++) {
        const a = (i / RING_STEPS) * Math.PI * 2;
        ringPts.push(project(Math.cos(a), 0, Math.sin(a), -dt * 0.38, 0.42, 0.24));
      }
      drawCurve(ringPts, cx, cy, ringR, 0, 0.28, 1.6);

      // 2. Solid charcoal sphere core
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = "#28282A";
      ctx.fill();

      // 3. Latitude parallels
      const LATS = [-66, -44, -22, 0, 22, 44, 66];
      const SEG = 72;
      for (const deg of LATS) {
        const phi = (deg * Math.PI) / 180;
        const y = Math.sin(phi);
        const r = Math.cos(phi);
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * Math.PI * 2;
          pts.push(project(Math.cos(th) * r, y, Math.sin(th) * r, spin, tiltX, tiltZ));
        }
        const eq = deg === 0;
        drawCurve(pts, cx, cy, R, eq ? 0.92 : 0.54, eq ? 0.22 : 0.13, eq ? 2.1 : 1.25);
      }

      // 4. Longitude meridians
      for (let m = 0; m < 6; m++) {
        const lon = (m / 6) * Math.PI;
        const cl = Math.cos(lon);
        const sl = Math.sin(lon);
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          const ca = Math.cos(a);
          const sa = Math.sin(a);
          pts.push(project(ca * cl, sa, ca * sl, spin, tiltX, tiltZ));
        }
        drawCurve(pts, cx, cy, R, 0.64, 0.14, 1.3);
      }

      // 5. Fibonacci AI star/neural nodes
      for (let i = 0; i < points.length; i++) {
        const [ux, uy, uz] = points[i];
        const [px, py, pz] = project(ux, uy, uz, spin, tiltX, tiltZ);
        const sx = cx + px * R;
        const sy = cy - py * R;
        const alpha = pz >= 0 ? 0.35 + pz * 0.65 : 0.08;
        const dotR = pz >= 0 ? 1.5 + pz * 1.45 : 1.0;
        ctx.beginPath();
        ctx.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 232, 211, ${alpha.toFixed(3)})`;
        ctx.fill();
      }

      // 6. Outer rim of the celestial sphere
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#F5E8D3";
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Dual voice waves while Atlas AI speaks
      if (isSpeaking) {
        for (let k = 0; k < 2; k++) {
          const wave = (dt * 1.15 + k * 0.5) % 1;
          ctx.beginPath();
          ctx.arc(cx, cy, R * (1.03 + wave * 0.24), 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(245, 232, 211, ${(1 - wave) * 0.62})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // 7. Front half of outer AI orbital ring + 3 orbiting beacons
      drawCurve(ringPts, cx, cy, ringR, 0.78, 0, 2.0);
      for (let b = 0; b < 3; b++) {
        const a = -dt * 0.38 + (b * Math.PI * 2) / 3;
        const [bx, by, bz] = project(Math.cos(a), 0, Math.sin(a), 0, 0.42, 0.24);
        if (bz >= -0.15) {
          const sx = cx + bx * ringR;
          const sy = cy - by * ringR;
          ctx.beginPath();
          ctx.arc(sx, sy, bz >= 0 ? 4.5 : 3, 0, Math.PI * 2);
          ctx.fillStyle = "#F5E8D3";
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        pointer.current.tx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        pointer.current.ty = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      }}
      onPointerLeave={() => {
        pointer.current.tx = 0;
        pointer.current.ty = 0;
      }}
      aria-label="Atlas AI spinning globe — tap to hear voice greeting"
      className="group relative mx-auto block h-[310px] w-[310px] cursor-pointer outline-none focus-visible:ring-4 focus-visible:ring-marble sm:h-[400px] sm:w-[400px]"
    >
      <canvas ref={canvasRef} className="h-full w-full" />
    </button>
  );
}
