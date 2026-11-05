"use client";

import { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  MemorySphere — Continuously spinning 3D-projected sphere          */
/*  Used for:                                                         */
/*   • The Memories Globe (glides to the left, press to go back)      */
/*   • The 5 Branch Spheres (Timeline, Gallery, Calendar, Journal,    */
/*     Milestones — in center constellation & right scroll rail)      */
/* ------------------------------------------------------------------ */

export type SphereGlyph =
  | "memories"
  | "timeline"
  | "gallery"
  | "calendar"
  | "journal"
  | "milestones";

export function MemorySphere({
  glyph,
  size = 128,
  active = false,
  tone = "wine",
  speed = 0.52,
  phaseOffset = 0,
}: {
  glyph: SphereGlyph;
  size?: number;
  active?: boolean;
  tone?: "wine" | "marble";
  speed?: number;
  phaseOffset?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const toneRef = useRef(tone);
  activeRef.current = active;
  toneRef.current = tone;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LOGICAL = 220;
    const DPR = 2;
    canvas.width = LOGICAL * DPR;
    canvas.height = LOGICAL * DPR;

    let emblemImg: HTMLImageElement | null = null;
    if (glyph === "memories") {
      const im = new Image();
      im.src = "/assets/emblems/memories.png";
      im.onload = () => {
        emblemImg = im;
      };
    }

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
      const z1 = -x * sn + z * cs;

      const cz = Math.cos(tiltZ);
      const sz = Math.sin(tiltZ);
      const x2 = x1 * cz - y * sz;
      const y2 = x1 * sz + y * cz;

      const cx = Math.cos(tiltX);
      const sx = Math.sin(tiltX);
      const y3 = y2 * cx - z1 * sx;
      const z3 = y2 * sx + z1 * cx;

      return [x2, y3, z3];
    };

    const drawGlyphIcon = (gx: number, gy: number, r: number, fg: string) => {
      ctx.save();
      ctx.translate(gx, gy);
      ctx.strokeStyle = fg;
      ctx.fillStyle = fg;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (glyph === "memories" && emblemImg) {
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#F5E8D3";
        ctx.fillRect(-r, -r, r * 2, r * 2);
        ctx.drawImage(emblemImg, -r * 0.88, -r * 0.88, r * 1.76, r * 1.76);
      } else if (glyph === "timeline") {
        // Vertical thread with 3 chronicle nodes
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.62);
        ctx.lineTo(0, r * 0.62);
        ctx.stroke();
        for (const dy of [-r * 0.44, 0, r * 0.44]) {
          ctx.beginPath();
          ctx.arc(0, dy, r * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.beginPath();
        ctx.moveTo(r * 0.24, -r * 0.44);
        ctx.lineTo(r * 0.56, -r * 0.44);
        ctx.moveTo(-r * 0.56, 0);
        ctx.lineTo(-r * 0.24, 0);
        ctx.moveTo(r * 0.24, r * 0.44);
        ctx.lineTo(r * 0.56, r * 0.44);
        ctx.stroke();
      } else if (glyph === "gallery") {
        // Classical frame with sun & mountain ridge
        const w = r * 1.12;
        const h = r * 0.88;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.beginPath();
        ctx.arc(-w * 0.2, -h * 0.16, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-w * 0.46, h * 0.38);
        ctx.lineTo(-w * 0.08, -h * 0.04);
        ctx.lineTo(w * 0.16, h * 0.22);
        ctx.lineTo(w * 0.32, h * 0.04);
        ctx.lineTo(w * 0.46, h * 0.38);
        ctx.stroke();
      } else if (glyph === "calendar") {
        // Month tablet & marked days
        const w = r * 1.08;
        const h = r * 1.02;
        ctx.strokeRect(-w / 2, -h / 2 + r * 0.06, w, h - r * 0.06);
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h * 0.16);
        ctx.lineTo(w / 2, -h * 0.16);
        ctx.moveTo(-w * 0.26, -h * 0.56);
        ctx.lineTo(-w * 0.26, -h * 0.34);
        ctx.moveTo(w * 0.26, -h * 0.56);
        ctx.lineTo(w * 0.26, -h * 0.34);
        ctx.stroke();
        for (const dx of [-w * 0.25, 0, w * 0.25]) {
          for (const dy of [h * 0.05, h * 0.28]) {
            ctx.beginPath();
            ctx.arc(dx, dy, r * 0.075, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (glyph === "journal") {
        // Stylus & inscribed scroll lines
        ctx.beginPath();
        ctx.moveTo(-r * 0.48, -r * 0.42);
        ctx.lineTo(r * 0.24, -r * 0.42);
        ctx.moveTo(-r * 0.48, -r * 0.08);
        ctx.lineTo(r * 0.14, -r * 0.08);
        ctx.moveTo(-r * 0.48, r * 0.26);
        ctx.lineTo(r * 0.04, r * 0.26);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.46, -r * 0.48);
        ctx.lineTo(r * 0.02, r * 0.44);
        ctx.lineTo(-r * 0.08, r * 0.52);
        ctx.lineTo(r * 0.34, -r * 0.54);
        ctx.closePath();
        ctx.fill();
      } else {
        // Milestones: 5-pointed classical star
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? r * 0.62 : r * 0.26;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    };

    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const dt = (now - t0) / 1000;
      const isAct = activeRef.current;
      const darkCore = toneRef.current === "wine" || isAct;

      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, LOGICAL, LOGICAL);

      const cx = LOGICAL / 2;
      const cy = LOGICAL / 2;
      const R = LOGICAL * 0.43;

      const spin = dt * (isAct ? speed * 1.45 : speed) + phaseOffset;
      const tiltX = 0.24;
      const tiltZ = -0.18;

      const bgFill = darkCore ? "#28282A" : "#F5E8D3";
      const lineRgb = darkCore ? "245, 232, 211" : "40, 40, 42";
      const solidStroke = darkCore ? "#F5E8D3" : "#28282A";

      // 1. Drop shadow halo for 3D depth on page
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy + 4, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(40, 40, 42, 0.22)";
      ctx.fill();
      ctx.restore();

      // 2. Sphere core fill
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = bgFill;
      ctx.fill();

      // 3. 3D Crescent Rim Shading (flat solid crescent band — respects two-color crispness)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(cx - R * 0.24, cy - R * 0.24, R * 0.96, 0, Math.PI * 2);
      ctx.fillStyle = darkCore ? "rgba(245, 232, 211, 0.07)" : "rgba(245, 232, 211, 0.55)";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + R * 0.42, cy + R * 0.42, R * 1.02, 0, Math.PI * 2);
      ctx.fillStyle = darkCore ? "rgba(0, 0, 0, 0.26)" : "rgba(40, 40, 42, 0.11)";
      ctx.fill();
      ctx.restore();

      // 4. Latitude & longitude wireframe curves
      const SEG = 56;
      const drawWire = (pts: [number, number, number][], fAlpha: number, bAlpha: number, lw: number) => {
        for (let pass = 0; pass < 2; pass++) {
          const front = pass === 1;
          ctx.beginPath();
          let down = false;
          for (let i = 0; i < pts.length; i++) {
            const [px, py, pz] = pts[i];
            if ((pz >= 0) === front) {
              const sx = cx + px * R;
              const sy = cy - py * R;
              if (!down) {
                ctx.moveTo(sx, sy);
                down = true;
              } else {
                ctx.lineTo(sx, sy);
              }
            } else {
              down = false;
            }
          }
          ctx.strokeStyle = `rgba(${lineRgb}, ${front ? fAlpha : bAlpha})`;
          ctx.lineWidth = lw;
          ctx.stroke();
        }
      };

      for (const deg of [-55, -26, 0, 26, 55]) {
        const phi = (deg * Math.PI) / 180;
        const y = Math.sin(phi);
        const r = Math.cos(phi);
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEG; i++) {
          const th = (i / SEG) * Math.PI * 2;
          pts.push(project(Math.cos(th) * r, y, Math.sin(th) * r, spin, tiltX, tiltZ));
        }
        const eq = deg === 0;
        drawWire(pts, eq ? 0.78 : 0.36, eq ? 0.16 : 0.08, eq ? 2.1 : 1.2);
      }

      for (let m = 0; m < 5; m++) {
        const lon = (m / 5) * Math.PI;
        const cl = Math.cos(lon);
        const sl = Math.sin(lon);
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= SEG; i++) {
          const a = (i / SEG) * Math.PI * 2;
          pts.push(project(Math.cos(a) * cl, Math.sin(a), Math.cos(a) * sl, spin, tiltX, tiltZ));
        }
        drawWire(pts, 0.44, 0.1, 1.25);
      }

      // 5. Center Medallion Emblem (anchored on front of the spinning 3D sphere with gentle bob)
      const medR = R * 0.44;
      const medOffsetX = Math.sin(spin) * R * 0.08;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx + medOffsetX, cy, medR + 3.5, 0, Math.PI * 2);
      ctx.fillStyle = darkCore ? "#F5E8D3" : "#28282A";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx + medOffsetX, cy, medR, 0, Math.PI * 2);
      ctx.fillStyle = darkCore ? "#28282A" : "#F5E8D3";
      ctx.fill();

      drawGlyphIcon(cx + medOffsetX, cy, medR * 0.82, darkCore ? "#F5E8D3" : "#28282A");
      ctx.restore();

      // 6. Crisp outer sphere border (+ active outer ring)
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "#28282A";
      ctx.lineWidth = darkCore ? 3.2 : 2.8;
      ctx.stroke();

      if (darkCore) {
        ctx.beginPath();
        ctx.arc(cx, cy, R - 2.6, 0, Math.PI * 2);
        ctx.strokeStyle = "#F5E8D3";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      if (isAct) {
        ctx.beginPath();
        ctx.arc(cx, cy, R + 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = solidStroke === "#F5E8D3" ? "#28282A" : solidStroke;
        ctx.setLineDash([6, 5]);
        ctx.lineDashOffset = -dt * 14;
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.setLineDash([]);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [glyph, phaseOffset, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="block select-none"
    />
  );
}
