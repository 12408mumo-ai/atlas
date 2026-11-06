/* ================================================================== */
/*  GoldenParticleSphere — the living orb of Atlas                    */
/*                                                                     */
/*  A cloud of warm-gold particles suspended in a sphere. They drift  */
/*  on slow currents, and when Atlas listens or speaks they ripple    */
/*  outward from the centre the way a voice carries through air.      */
/*                                                                     */
/*  Drawn on one canvas at device resolution so the motion is smooth */
/*  and there is never a single button in sight.                       */
/* ================================================================== */

"use client";

import { useEffect, useRef } from "react";

type Particle = {
  /** Unit-sphere position. */
  x: number;
  y: number;
  z: number;
  /** Current drift speed around the vertical axis. */
  drift: number;
  /** Current drift speed on the vertical axis. */
  bob: number;
  /** Size of the dot in logical pixels. */
  size: number;
  /** Brightness 0..1 — some particles sit deeper in shadow. */
  depth: number;
  /** Phase so every particle moves a little differently. */
  phase: number;
};

export function GoldenParticleSphere({
  /** 0 = still, 1 = full voice-wave ripple. */
  energy = 0,
  /** True while the mic is open — particles lean toward the centre. */
  listening = false,
  className = "",
}: {
  energy?: number;
  listening?: boolean;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const energyRef = useRef(energy);
  const listeningRef = useRef(listening);
  energyRef.current = energy;
  listeningRef.current = listening;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const LOGICAL = 380;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL * DPR;
    canvas.height = LOGICAL * DPR;

    /* ---- seed the particles on a hollow-ish sphere ---- */
    const COUNT = 260;
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      // Even spread over the sphere surface.
      const y = 1 - (i / (COUNT - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      particles.push({
        x: Math.cos(theta) * rad,
        y,
        z: Math.sin(theta) * rad,
        drift: 0.1 + Math.random() * 0.26,
        bob: 0.06 + Math.random() * 0.2,
        size: 0.7 + Math.random() * 1.9,
        depth: 0.35 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const dt = Math.min((now - t0) / 1000, 0.05);
      const w = LOGICAL;
      const h = LOGICAL;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;
      const en = energyRef.current;
      const isListening = listeningRef.current;

      /* ---- a soft halo that breathes with the energy ---- */
      const haloR = w * 0.34;
      const halo = ctx.createRadialGradient(cx, cy, haloR * 0.1, cx, cy, haloR * 1.5);
      const glow = 0.05 + en * 0.13 + (isListening ? 0.05 : 0);
      halo.addColorStop(0, `rgba(245, 232, 211, ${glow.toFixed(3)})`);
      halo.addColorStop(0.55, `rgba(245, 232, 211, ${(glow * 0.35).toFixed(3)})`);
      halo.addColorStop(1, "rgba(245, 232, 211, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, haloR * 1.5, 0, Math.PI * 2);
      ctx.fill();

      /* ---- voice rings: concentric waves leaving the centre ---- */
      const ringCount = 3;
      for (let k = 0; k < ringCount; k++) {
        const wave = (now / 1000 * 0.55 + k / ringCount) % 1;
        const r = haloR * (0.34 + wave * 0.86);
        const fade = Math.pow(1 - wave, 1.6);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 232, 211, ${(fade * (0.07 + en * 0.3)).toFixed(3)})`;
        ctx.lineWidth = 1.1 + en * 1.6;
        ctx.stroke();
      }

      /* ---- the particles themselves ---- */
      const tiltX = 0.2;
      const tiltZ = -0.26;

      for (const p of particles) {
        // Slow drift around the vertical axis.
        const ang = p.drift * dt * 3.4;
        const cs = Math.cos(ang);
        const sn = Math.sin(ang);
        let x = p.x * cs - p.z * sn;
        let z = p.x * sn + p.z * cs;

        // A gentle bob so the swarm never looks frozen.
        const wave = Math.sin(now / 1000 * 0.7 + p.phase);
        let y = p.y + wave * 0.035;

        /* ---- the ripple: particles pushed outward by passing waves ---- */
        if (en > 0.01) {
          const ring = (now / 1000 * 0.55) % 1;
          const radial = Math.sqrt(x * x + y * y + z * z) || 1;
          // Distance of this particle from the centre, 0..1.
          const dist = (x * x + y * y + z * z) ** 0.5;
          const band = Math.abs(dist - (0.35 + ring * 0.85));
          const push = Math.exp(-((band / 0.16) ** 2)) * en * 0.22;
          const nx = x / radial;
          const ny = y / radial;
          const nz = z / radial;
          x += nx * push;
          y += ny * push;
          z += nz * push;

          // While the mic is open, particles drift gently inward.
          if (isListening) {
            const pull = 0.012 * (1 - dist);
            x -= nx * pull;
            y -= ny * pull;
            z -= nz * pull;
          }
        }

        // Tilt the sphere so it reads as a globe of light.
        const cxr = Math.cos(tiltX);
        const sxr = Math.sin(tiltX);
        const y2 = y * cxr - z * sxr;
        const z2 = y * sxr + z * cxr;
        const czt = Math.cos(tiltZ);
        const szt = Math.sin(tiltZ);
        const x2 = x * czt - y2 * szt;
        const y3 = x * szt + y2 * czt;

        const R = haloR;
        const px = cx + x2 * R;
        const py = cy - y3 * R;
        const front = z2 >= 0;

        // Particles at the back are dimmer and smaller.
        const depthFactor = front ? 0.45 + z2 * 0.55 : 0.12;
        const alpha = p.depth * depthFactor * (0.5 + en * 0.5);
        const radius = p.size * (front ? 1 : 0.62) * (1 + en * 0.35);

        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.35, radius), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245, 232, 211, ${alpha.toFixed(3)})`;
        ctx.fill();

        // The brightest front particles get a glow.
        if (front && p.depth > 0.78 && en > 0.05) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, radius * 4);
          g.addColorStop(0, `rgba(245, 232, 211, ${(alpha * 0.4).toFixed(3)})`);
          g.addColorStop(1, "rgba(245, 232, 211, 0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(tick);
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

export default GoldenParticleSphere;
