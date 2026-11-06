/* ================================================================== */
/*  GoldenParticleSphere — the living orb of Atlas                    */
/*                                                                     */
/*  A sphere of warm-gold particles suspended in the dark. They drift */
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
  /** Drift speed around the vertical axis. */
  drift: number;
  /** Drift speed on the vertical axis. */
  bob: number;
  /** Dot radius in logical pixels. */
  size: number;
  /** Brightness 0..1 — some particles sit deeper in shadow. */
  depth: number;
  /** Phase so every particle moves a little differently. */
  phase: number;
  /** A few particles are brighter, like sparks. */
  spark: boolean;
};

const GOLD = "245, 232, 211";
const AMBER = "214, 176, 112";

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

    const LOGICAL = 420;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL * DPR;
    canvas.height = LOGICAL * DPR;

    /* ---- seed the particles on a sphere ---- */
    const COUNT = 420;
    const particles: Particle[] = [];
    for (let i = 0; i < COUNT; i++) {
      // Even spread over the sphere surface.
      const y = 1 - (i / (COUNT - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = Math.PI * (3 - Math.sqrt(5)) * i;
      const isSpark = Math.random() < 0.12;
      particles.push({
        x: Math.cos(theta) * rad,
        y,
        z: Math.sin(theta) * rad,
        drift: 0.12 + Math.random() * 0.3,
        bob: 0.05 + Math.random() * 0.22,
        size: isSpark ? 1.8 + Math.random() * 2.2 : 0.6 + Math.random() * 1.5,
        depth: isSpark ? 0.9 + Math.random() * 0.1 : 0.35 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        spark: isSpark,
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
      const time = now / 1000;

      /* ---- the sphere's radius ---- */
      const R = w * 0.31;

      /* ---- a warm halo that breathes with the energy ---- */
      const halo = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.65);
      const glow = 0.05 + en * 0.14 + (isListening ? 0.05 : 0);
      halo.addColorStop(0, `rgba(${AMBER}, ${(glow * 0.75).toFixed(3)})`);
      halo.addColorStop(0.4, `rgba(${GOLD}, ${(glow * 0.4).toFixed(3)})`);
      halo.addColorStop(0.72, `rgba(${AMBER}, ${(glow * 0.12).toFixed(3)})`);
      halo.addColorStop(1, `rgba(${AMBER}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.65, 0, Math.PI * 2);
      ctx.fill();

      /* ---- voice rings leaving the centre ---- */
      const ringCount = 3;
      for (let k = 0; k < ringCount; k++) {
        const wave = (time * 0.5 + k / ringCount) % 1;
        const r = R * (0.42 + wave * 0.92);
        const fade = Math.pow(1 - wave, 1.5);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD}, ${(fade * (0.06 + en * 0.3)).toFixed(3)})`;
        ctx.lineWidth = 1 + en * 1.8;
        ctx.stroke();
      }

      /* ---- the particles ---- */
      const tiltX = 0.16;
      const tiltZ = -0.22;
      const ringPhase = (time * 0.5) % 1;

      for (const p of particles) {
        // Slow drift around the vertical axis.
        const ang = p.drift * dt * 3.2;
        const cs = Math.cos(ang);
        const sn = Math.sin(ang);
        let x = p.x * cs - p.z * sn;
        let z = p.x * sn + p.z * cs;

        // A gentle bob so the swarm never looks frozen.
        let y = p.y + Math.sin(time * 0.6 + p.phase) * 0.03;

        /* ---- the voice ripple pushes particles outward ---- */
        if (en > 0.01) {
          const dist = Math.sqrt(x * x + y * y + z * z) || 1;
          const band = Math.abs(dist - (0.4 + ringPhase * 0.8));
          const push = Math.exp(-((band / 0.15) ** 2)) * en * 0.2;
          x += (x / dist) * push;
          y += (y / dist) * push;
          z += (z / dist) * push;

          // While the mic is open the particles drift gently inward.
          if (isListening) {
            const pull = 0.014 * (1 - dist);
            x -= (x / dist) * pull;
            y -= (y / dist) * pull;
            z -= (z / dist) * pull;
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

        const px = cx + x2 * R;
        const py = cy - y3 * R;
        const front = z2 >= 0;

        // Particles at the back are dimmer and smaller.
        const depthFactor = front ? 0.4 + z2 * 0.6 : 0.1;
        const alpha = p.depth * depthFactor * (0.55 + en * 0.45);
        const radius = p.size * (front ? 1 : 0.55) * (1 + en * 0.3);

        // The glow around each dot.
        const bloom = radius * (p.spark ? 5 : 3);
        const g = ctx.createRadialGradient(px, py, 0, px, py, bloom);
        const warm = p.spark ? AMBER : GOLD;
        g.addColorStop(0, `rgba(${warm}, ${(alpha * 0.55).toFixed(3)})`);
        g.addColorStop(0.4, `rgba(${warm}, ${(alpha * 0.16).toFixed(3)})`);
        g.addColorStop(1, `rgba(${warm}, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, bloom, 0, Math.PI * 2);
        ctx.fill();

        // The dot itself.
        ctx.beginPath();
        ctx.arc(px, py, Math.max(0.3, radius), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 248, 235, ${Math.min(1, alpha * 1.35).toFixed(3)})`;
        ctx.fill();
      }

      /* ---- a faint rim so the sphere has an edge ---- */
      const rim = ctx.createRadialGradient(
        cx, cy, R * 0.86, cx, cy, R * 1.06
      );
      rim.addColorStop(0, `rgba(${GOLD}, 0)`);
      rim.addColorStop(0.55, `rgba(${GOLD}, ${(0.05 + en * 0.12).toFixed(3)})`);
      rim.addColorStop(1, `rgba(${GOLD}, 0)`);
      ctx.fillStyle = rim;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.06, 0, Math.PI * 2);
      ctx.fill();

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
