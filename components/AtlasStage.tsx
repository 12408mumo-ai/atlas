"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  AtlasStage — Full-viewport 3D Sanctuary (/hub)                    */
/*  • Vivid moving 3D spiral space galaxy that follows cursor         */
/*  • Watertight 3D sculpted marble Atlas statue + 3D celestial globe */
/*  • 6 spinning 3D spheres orbiting in deep 3D space with ZERO       */
/*    visible orbit lines, visibly eclipsing & disappearing behind    */
/*    the 3D globe on every orbit                                     */
/* ------------------------------------------------------------------ */

export type Pillar = {
  key: string;
  name: string;
  greek: string;
  href: string;
  image: string;
  blurb: string;
  orbit: {
    rx: number;
    rz: number;
    tiltZ: number;
    pitchX: number;
    liftY: number;
    period: number;
    phase: number;
  };
};

export const PILLARS: Pillar[] = [
  {
    key: "work",
    name: "Work",
    greek: "Ἔργον",
    href: "/work",
    image: "/assets/emblems/work.png",
    blurb: "Client projects, tasks, time, income and your own ventures.",
    orbit: { rx: 1.66, rz: 1.92, tiltZ: -19, pitchX: 5, liftY: 0.06, period: 12.5, phase: 0.2 },
  },
  {
    key: "study",
    name: "Study",
    greek: "Μάθησις",
    href: "/study",
    image: "/assets/emblems/study.png",
    blurb: "Timetable, courses, assignments, exams and self-learning.",
    orbit: { rx: 1.96, rz: 2.12, tiltZ: 16, pitchX: -5, liftY: -0.1, period: 14.8, phase: 1.35 },
  },
  {
    key: "people",
    name: "People",
    greek: "Ἄνθρωποι",
    href: "/people",
    image: "/assets/emblems/people.png",
    blurb: "Everyone who matters — dates, promises, gifts, check-ins.",
    orbit: { rx: 1.8, rz: 2.02, tiltZ: 25, pitchX: 4, liftY: 0.12, period: 13.6, phase: 2.55 },
  },
  {
    key: "life",
    name: "Life",
    greek: "Βίος",
    href: "/life",
    image: "/assets/emblems/life.png",
    blurb: "Health, money, habits and the 1–5 of how you actually feel.",
    orbit: { rx: 2.14, rz: 2.24, tiltZ: -24, pitchX: -6, liftY: -0.08, period: 16.2, phase: 3.72 },
  },
  {
    key: "memories",
    name: "Memories",
    greek: "Μνῆμαι",
    href: "/memories",
    image: "/assets/emblems/memories.png",
    blurb: "Every log, journal and milestone — the timeline of you.",
    orbit: { rx: 2.32, rz: 2.36, tiltZ: 9, pitchX: 4, liftY: 0.14, period: 17.6, phase: 4.85 },
  },
  {
    key: "atlas",
    name: "Atlas AI",
    greek: "Ὁ Τιτάν",
    href: "/atlas",
    image: "/icons/sphere-192.png?v=4",
    blurb: "Speak with the Titan AI that weighs and plans your world.",
    orbit: { rx: 1.52, rz: 1.82, tiltZ: -10, pitchX: -4, liftY: -0.12, period: 11.4, phase: 5.68 },
  },
];

/* Exact monument calibration matching cleaned atlas-body-3d.png (768x1152) */
const STATUE_H = 6.55;
const STATUE_W = (STATUE_H * 2) / 3; // 4.3667
const STATUE_CENTER_Y = -0.36;
const GLOBE_X = (0.50371 - 0.5) * STATUE_W;
const GLOBE_Y = STATUE_CENTER_Y + (0.5 - 0.19141) * STATUE_H;
const GLOBE_Z = 0.0;
const R_GLOBE = 0.2293 * STATUE_W * 1.016; // ~1.017
const R_ORB = 0.255;

/* ------------------------------------------------------------------ */
/*  Custom GLSL Shaders: Spiral Space Galaxy, Starfield & Rim Glow    */
/* ------------------------------------------------------------------ */

const GALAXY_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute float aArmRadius;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursorWorld;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Continuous differential spiral galaxy rotation
  float angularVel = 0.085 + 0.24 / (0.55 + aArmRadius * 0.26);
  float swirl = uTime * angularVel;
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec2 spun = vec2(pos.x * cs - pos.z * sn, pos.x * sn + pos.z * cs);
  pos.x = spun.x;
  pos.z = spun.y;
  pos.y += sin(uTime * 0.7 + aPhase * 6.2831) * 0.11;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);

  // Gravitational + luminescence wave following the cursor across the screen
  vec2 toCursor = uCursorWorld.xy - worldPos.xy;
  float cDist = length(toCursor);
  float wake = exp(-cDist * cDist * 0.095);
  worldPos.xy += toCursor * (wake * 0.30);
  worldPos.z += wake * 0.75;

  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.78 + 0.22 * sin(uTime * 2.5 + aPhase * 6.2831);
  vColor = mix(aColor, vec3(1.0, 0.96, 0.88), wake * 0.75);
  vAlpha = clamp(twinkle + wake * 0.55, 0.0, 1.0);

  float sizeAtten = (275.0 * uPixelRatio) / max(1.5, -mvPosition.z);
  gl_PointSize = clamp(aSize * sizeAtten * (1.0 + wake * 0.65), 1.4, 60.0);
}
`;

const STARFIELD_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
attribute vec3 aColor;

uniform float uTime;
uniform float uPixelRatio;
uniform vec3 uCursorWorld;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 pos = position;
  pos.x += sin(uTime * 0.16 + aPhase * 6.2831) * 0.55;
  pos.y += cos(uTime * 0.13 + aPhase * 9.4247) * 0.42;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vec2 toCursor = uCursorWorld.xy - worldPos.xy;
  float wake = exp(-dot(toCursor, toCursor) * 0.075);
  worldPos.xy += toCursor * (wake * 0.24);

  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.72 + 0.28 * sin(uTime * 2.8 + aPhase * 12.566);
  vColor = mix(aColor, vec3(1.0, 0.95, 0.86), wake * 0.6);
  vAlpha = clamp(twinkle + wake * 0.4, 0.0, 1.0);

  float sizeAtten = (230.0 * uPixelRatio) / max(2.0, -mvPosition.z);
  gl_PointSize = clamp(aSize * sizeAtten, 1.2, 36.0);
}
`;

const GALAXY_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;

  float core = exp(-d * d * 5.2);
  float halo = pow(max(0.0, 1.0 - d), 2.1) * 0.62;
  float strength = clamp(core + halo, 0.0, 1.0);

  gl_FragColor = vec4(vColor * (0.95 + core * 0.55), strength * vAlpha);
}
`;

const GLOBE_RIM_VERT = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vNormalW = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - worldPos.xyz);
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const GLOBE_RIM_FRAG = /* glsl */ `
varying vec3 vNormalW;
varying vec3 vViewDir;

void main() {
  float fresnel = pow(1.0 - clamp( abs(dot(vNormalW, vViewDir)), 0.0, 1.0 ), 3.2);
  gl_FragColor = vec4(vec3(0.96, 0.91, 0.82), fresnel * 0.42);
}
`;

function createNebulaGlowTexture(warm: boolean): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  if (warm) {
    grad.addColorStop(0, "rgba(255, 245, 224, 0.85)");
    grad.addColorStop(0.32, "rgba(245, 232, 211, 0.42)");
    grad.addColorStop(0.68, "rgba(182, 160, 134, 0.14)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  } else {
    grad.addColorStop(0, "rgba(205, 218, 248, 0.65)");
    grad.addColorStop(0.38, "rgba(122, 142, 192, 0.30)");
    grad.addColorStop(0.72, "rgba(68, 82, 128, 0.10)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Sculpted 3D Marble + Medallion Textures for Orbiting 3D Spheres   */
/* ------------------------------------------------------------------ */

function createPillarOrbTextures(
  pillar: Pillar
): { map: THREE.CanvasTexture; bumpMap: THREE.CanvasTexture } {
  const cw = 512;
  const ch = 256;

  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  const bCanvas = document.createElement("canvas");
  bCanvas.width = cw;
  bCanvas.height = ch;
  const bCtx = bCanvas.getContext("2d")!;

  const draw = (emblem?: HTMLImageElement) => {
    // Rich warm sculpted marble tone (avoids blowing out to flat white under 3D lights)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, ch);
    baseGrad.addColorStop(0, "#B8A58B");
    baseGrad.addColorStop(0.18, "#DFCCB2");
    baseGrad.addColorStop(0.5, "#EFE0C9");
    baseGrad.addColorStop(0.82, "#DFCCB2");
    baseGrad.addColorStop(1, "#B8A58B");
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, cw, ch);

    bCtx.fillStyle = "#888888";
    bCtx.fillRect(0, 0, cw, ch);

    // Subtle classical marble veining across the sphere
    ctx.save();
    ctx.strokeStyle = "rgba(95, 80, 65, 0.14)";
    ctx.lineWidth = 1.6;
    for (let v = 0; v < 14; v++) {
      ctx.beginPath();
      let y = ((v + 0.5) / 14) * ch;
      ctx.moveTo(0, y);
      for (let x = 16; x <= cw; x += 16) {
        y += Math.sin(x * 0.045 + v * 1.9) * 2.4;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Engraved celestial parallels & meridians (recessed in bumpMap)
    ctx.strokeStyle = "rgba(40, 40, 42, 0.34)";
    bCtx.strokeStyle = "#303030";
    ctx.lineWidth = 1.6;
    bCtx.lineWidth = 2.4;

    for (let lat = 1; lat < 6; lat++) {
      const y = (lat / 6) * ch;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(0, y);
      bCtx.lineTo(cw, y);
      bCtx.stroke();
    }

    for (let lon = 0; lon < 12; lon++) {
      const x = (lon / 12) * cw;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();

      bCtx.beginPath();
      bCtx.moveTo(x, 0);
      bCtx.lineTo(x, ch);
      bCtx.stroke();
    }

    // Carved charcoal equatorial band
    ctx.fillStyle = "rgba(40, 40, 42, 0.16)";
    ctx.fillRect(0, ch * 0.44, cw, ch * 0.12);
    ctx.strokeStyle = "rgba(40, 40, 42, 0.58)";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, ch * 0.44);
    ctx.lineTo(cw, ch * 0.44);
    ctx.moveTo(0, ch * 0.56);
    ctx.lineTo(cw, ch * 0.56);
    ctx.stroke();

    // 3 sculpted emblem medallions spaced 120° around the sphere so one is always visible as it spins
    const rMed = 48;
    for (const cx of [cw / 6, cw / 2, (cw * 5) / 6]) {
      const cy = ch * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, rMed + 6, 0, Math.PI * 2);
      ctx.fillStyle = "#28282A";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, rMed + 2, 0, Math.PI * 2);
      ctx.strokeStyle = "#F5E8D3";
      ctx.lineWidth = 2;
      ctx.stroke();

      if (emblem) {
        ctx.beginPath();
        ctx.arc(cx, cy, rMed, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#F5E8D3";
        ctx.fillRect(cx - rMed, cy - rMed, rMed * 2, rMed * 2);
        ctx.drawImage(emblem, cx - rMed, cy - rMed, rMed * 2, rMed * 2);
      }
      ctx.restore();

      // Raised medallion relief in bumpMap
      bCtx.save();
      bCtx.beginPath();
      bCtx.arc(cx, cy, rMed + 6, 0, Math.PI * 2);
      bCtx.fillStyle = "#D8D8D8";
      bCtx.fill();
      bCtx.beginPath();
      bCtx.arc(cx, cy, rMed, 0, Math.PI * 2);
      bCtx.fillStyle = "#B8B8B8";
      bCtx.fill();
      bCtx.restore();
    }
  };

  draw();

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    draw(img);
    map.needsUpdate = true;
    bumpMap.needsUpdate = true;
  };
  img.src = pillar.image;

  return { map, bumpMap };
}

/* ------------------------------------------------------------------ */
/*  Watertight 3D Sculpted Marble Atlas Mesh + Multi-Tiered Plinth    */
/* ------------------------------------------------------------------ */

async function buildSculptedAtlasMesh(
  albedoTex: THREE.Texture
): Promise<{ group: THREE.Group; hitMesh: THREE.Mesh; normalTex: THREE.DataTexture }> {
  const group = new THREE.Group();

  const depthImg = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.crossOrigin = "anonymous";
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = "/assets/atlas-body-depth.png?v=4";
  });

  const albedoImg = albedoTex.image as HTMLImageElement;
  const gw = 196;
  const gh = 294;

  const dCanvas = document.createElement("canvas");
  dCanvas.width = gw;
  dCanvas.height = gh;
  const dCtx = dCanvas.getContext("2d")!;
  dCtx.drawImage(depthImg, 0, 0, gw, gh);
  const depthPixels = dCtx.getImageData(0, 0, gw, gh).data;

  const aCanvas = document.createElement("canvas");
  aCanvas.width = gw;
  aCanvas.height = gh;
  const aCtx = aCanvas.getContext("2d")!;
  aCtx.drawImage(albedoImg, 0, 0, gw, gh);
  const alphaPixels = aCtx.getImageData(0, 0, gw, gh).data;

  // High-resolution tangent normal map from G & B channels of atlas-body-depth.png
  const nw = depthImg.width;
  const nh = depthImg.height;
  const nCanvas = document.createElement("canvas");
  nCanvas.width = nw;
  nCanvas.height = nh;
  const nCtx = nCanvas.getContext("2d")!;
  nCtx.drawImage(depthImg, 0, 0, nw, nh);
  const rawNPixels = nCtx.getImageData(0, 0, nw, nh).data;
  const normalBytes = new Uint8Array(nw * nh * 4);
  for (let i = 0; i < nw * nh; i++) {
    const nx = (rawNPixels[i * 4 + 1] / 255) * 2 - 1;
    const ny = (rawNPixels[i * 4 + 2] / 255) * 2 - 1;
    const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
    normalBytes[i * 4] = Math.round((nx * 0.5 + 0.5) * 255);
    normalBytes[i * 4 + 1] = Math.round((ny * 0.5 + 0.5) * 255);
    normalBytes[i * 4 + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    normalBytes[i * 4 + 3] = 255;
  }
  const normalTex = new THREE.DataTexture(normalBytes, nw, nh, THREE.RGBAFormat);
  normalTex.flipY = true;
  normalTex.needsUpdate = true;

  const vCols = gw;
  const vRows = gh;
  const totalFront = vCols * vRows;
  const positions = new Float32Array(totalFront * 2 * 3);
  const uvs = new Float32Array(totalFront * 2 * 2);
  const validVert = new Uint8Array(totalFront);

  const globeClearRadiusSq = (R_GLOBE + 0.045) * (R_GLOBE + 0.045);

  for (let r = 0; r < vRows; r++) {
    const vFrac = r / (vRows - 1);
    const yWorld = STATUE_CENTER_Y + (0.5 - vFrac) * STATUE_H;
    const yImg = vFrac * 1536;

    for (let c = 0; c < vCols; c++) {
      const uFrac = c / (vCols - 1);
      const xWorld = (uFrac - 0.5) * STATUE_W;
      const xImg = uFrac * 1024;

      const idx = r * vCols + c;
      const alpha = alphaPixels[idx * 4 + 3] / 255;
      const hNorm = depthPixels[idx * 4] / 255;

      if (alpha > 0.18) validVert[idx] = 1;

      const dxG = xWorld - GLOBE_X;
      const dyG = yWorld - GLOBE_Y;
      const rSqG = dxG * dxG + dyG * dyG;
      const sphereSurfaceZ =
        rSqG < globeClearRadiusSq ? Math.sqrt(globeClearRadiusSq - rSqG) + 0.04 : 0;

      // Deep 3D anatomical sculptural volumes (bowed head, raised elbows, chest, forward knee, pedestal)
      const headEnv =
        Math.exp(-Math.pow((xImg - 532) / 115, 2) - Math.pow((yImg - 462) / 112, 2)) * 0.72;
      const shoulderEnv =
        Math.exp(-Math.pow((xImg - 516) / 245, 2) - Math.pow((yImg - 535) / 95, 2)) * 0.52;
      const leftArmEnv =
        Math.exp(-Math.pow((xImg - 255) / 95, 2) - Math.pow((yImg - 485) / 120, 2)) * 0.46;
      const rightArmEnv =
        Math.exp(-Math.pow((xImg - 785) / 95, 2) - Math.pow((yImg - 485) / 120, 2)) * 0.46;
      const torsoEnv =
        Math.exp(-Math.pow((xImg - 500) / 180, 2) - Math.pow((yImg - 740) / 235, 2)) * 0.48;
      const forwardKneeEnv =
        Math.exp(-Math.pow((xImg - 638) / 112, 2) - Math.pow((yImg - 1030) / 215, 2)) * 0.62;
      const plinthEnv =
        yImg > 1280 ? Math.sqrt(Math.max(0, 1 - Math.pow((xImg - 512) / 345, 2))) * 0.55 : 0;

      const edgeRound = sphereSurfaceZ > 0 ? 1.0 : Math.min(1, 0.35 + hNorm * 1.15);
      const baseSculptZ =
        0.16 +
        (hNorm * 0.78 +
          headEnv +
          shoulderEnv +
          leftArmEnv +
          rightArmEnv +
          torsoEnv +
          forwardKneeEnv +
          plinthEnv) *
          edgeRound;

      const zFront = Math.max(baseSculptZ, sphereSurfaceZ > 0 ? sphereSurfaceZ + hNorm * 0.16 : 0);
      const zBack = -0.22 - (hNorm * 0.52 + torsoEnv * 0.4 + plinthEnv * 0.65);

      positions[idx * 3] = xWorld;
      positions[idx * 3 + 1] = yWorld;
      positions[idx * 3 + 2] = zFront;
      uvs[idx * 2] = uFrac;
      uvs[idx * 2 + 1] = 1 - vFrac;

      const bIdx = totalFront + idx;
      positions[bIdx * 3] = xWorld;
      positions[bIdx * 3 + 1] = yWorld;
      positions[bIdx * 3 + 2] = zBack;
      uvs[bIdx * 2] = uFrac;
      uvs[bIdx * 2 + 1] = 1 - vFrac;
    }
  }

  // Cell validity grid + watertight side-wall stitching along every boundary edge
  const cellCols = vCols - 1;
  const cellRows = vRows - 1;
  const cellValid = new Uint8Array(cellRows * cellCols);
  const indices: number[] = [];

  for (let r = 0; r < cellRows; r++) {
    for (let c = 0; c < cellCols; c++) {
      const i00 = r * vCols + c;
      const i10 = i00 + 1;
      const i01 = i00 + vCols;
      const i11 = i01 + 1;
      if (validVert[i00] && validVert[i10] && validVert[i01] && validVert[i11]) {
        cellValid[r * cellCols + c] = 1;
        // Front shell (CCW +Z)
        indices.push(i00, i01, i10, i10, i01, i11);
        // Back shell (CCW -Z)
        const b00 = totalFront + i00;
        const b10 = totalFront + i10;
        const b01 = totalFront + i01;
        const b11 = totalFront + i11;
        indices.push(b00, b10, b01, b10, b11, b01);
      }
    }
  }

  const isCellValid = (r: number, c: number) =>
    r >= 0 && r < cellRows && c >= 0 && c < cellCols && cellValid[r * cellCols + c] === 1;

  // Stitch solid 3D side walls around the entire silhouette perimeter
  for (let r = 0; r < cellRows; r++) {
    for (let c = 0; c < cellCols; c++) {
      if (!isCellValid(r, c)) continue;
      const i00 = r * vCols + c;
      const i10 = i00 + 1;
      const i01 = i00 + vCols;
      const i11 = i01 + 1;
      const b00 = totalFront + i00;
      const b10 = totalFront + i10;
      const b01 = totalFront + i01;
      const b11 = totalFront + i11;

      // Top boundary (+Y outward normal)
      if (!isCellValid(r - 1, c)) {
        indices.push(i00, i10, b00, i10, b10, b00);
      }
      // Bottom boundary (-Y outward normal)
      if (!isCellValid(r + 1, c)) {
        indices.push(i11, i01, b11, i01, b01, b11);
      }
      // Left boundary (-X outward normal)
      if (!isCellValid(r, c - 1)) {
        indices.push(i01, i00, b01, i00, b00, b01);
      }
      // Right boundary (+X outward normal)
      if (!isCellValid(r, c + 1)) {
        indices.push(i10, i11, b10, i11, b11, b10);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    map: albedoTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: 0.5,
    metalness: 0.06,
    alphaTest: 0.14,
    transparent: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // Multi-tiered 3D cylindrical classical marble plinth backing
  const plinthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#C7B59B"),
    roughness: 0.58,
    metalness: 0.06,
  });

  const upperDrum = new THREE.Mesh(new THREE.CylinderGeometry(1.24, 1.28, 0.56, 64), plinthMat);
  upperDrum.position.set(0.0, STATUE_CENTER_Y - STATUE_H * 0.5 + 0.52, -0.22);
  group.add(upperDrum);

  const lowerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.42, 0.24, 64), plinthMat);
  lowerPlinth.position.set(0.0, STATUE_CENTER_Y - STATUE_H * 0.5 + 0.16, -0.22);
  group.add(lowerPlinth);

  return { group, hitMesh: mesh, normalTex };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AtlasStage() {
  const router = useRouter();
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const hoveredKeyRef = useRef<string | null>(null);
  const openingRef = useRef(false);
  const [opening, setOpening] = useState<Pillar | null>(null);

  const openPillar = useCallback(
    (p: Pillar) => {
      if (openingRef.current) return;
      openingRef.current = true;
      setOpening(p);
      window.setTimeout(() => router.push(p.href), 360);
    },
    [router]
  );

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let disposed = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    /* ---- Renderer, Scene, Camera ---- */
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(dpr);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.04;
    renderer.setClearColor(new THREE.Color("#07080E"), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      120
    );
    const getBaseCamZ = (w: number, h: number) => {
      const aspect = w / Math.max(1, h);
      if (aspect < 0.65) return 10.8;
      if (aspect < 0.95) return 9.6;
      return 8.55;
    };
    camera.position.set(0, 0.18, getBaseCamZ(container.clientWidth, container.clientHeight));
    camera.lookAt(0, 0.1, 0);

    /* ---- Sculptural 3D Three-Point + Cursor Lighting ---- */
    // Lower ambient + crisp directional key + cool cosmic rim = unmistakable 3D sphere & statue depth
    const ambient = new THREE.AmbientLight("#F5E8D3", 0.34);
    scene.add(ambient);

    const hemiLight = new THREE.HemisphereLight("#FFF3DC", "#1B1E2B", 0.38);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight("#FFF2DA", 1.48);
    keyLight.position.set(4.2, 5.4, 5.8);
    scene.add(keyLight);

    const rimLightLeft = new THREE.DirectionalLight("#9EB2DE", 0.92);
    rimLightLeft.position.set(-6.2, 2.8, -3.6);
    scene.add(rimLightLeft);

    const rimLightRight = new THREE.DirectionalLight("#F5E8D3", 0.68);
    rimLightRight.position.set(5.8, -1.5, -4.0);
    scene.add(rimLightRight);

    const cursorLight = new THREE.PointLight("#FFEBC8", 2.15, 14, 1.5);
    cursorLight.position.set(0, 1.6, 4.4);
    scene.add(cursorLight);

    /* ---- 1. Vivid Moving 3D Spiral Space Galaxy Background ---- */
    const galaxyAnchor = new THREE.Group();
    galaxyAnchor.position.set(0, 0.35, -10.2);
    scene.add(galaxyAnchor);

    const galaxyPlane = new THREE.Group();
    galaxyPlane.rotation.set(0.68, 0.0, -0.28);
    galaxyAnchor.add(galaxyPlane);

    const STAR_COUNT = 14000;
    const gPositions = new Float32Array(STAR_COUNT * 3);
    const gColors = new Float32Array(STAR_COUNT * 3);
    const gSizes = new Float32Array(STAR_COUNT);
    const gPhases = new Float32Array(STAR_COUNT);
    const gRadii = new Float32Array(STAR_COUNT);

    const colCore = new THREE.Color("#FFF6E5");
    const colArmWarm = new THREE.Color("#F5E8D3");
    const colArmMid = new THREE.Color("#BAC8EC");
    const colOuter = new THREE.Color("#6D82B8");
    const tmpCol = new THREE.Color();

    const ARMS = 4;
    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const isCore = i < 2400;
      const u = Math.random();
      const radius = isCore ? Math.pow(u, 1.7) * 2.8 : 0.65 + Math.pow(u, 0.8) * 13.5;

      const armAngle = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spiralTwist = radius * 0.52;
      const scatterScale = isCore ? 0.5 : 0.26 + radius * 0.075;

      const g1 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);
      const g2 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);
      const g3 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);

      const angle = armAngle + spiralTwist + g1 * (isCore ? 0.88 : 0.24);
      gPositions[i3] = Math.cos(angle) * radius + g2 * scatterScale * 0.42;
      gPositions[i3 + 1] = g3 * (isCore ? 0.46 : 0.2 + radius * 0.025);
      gPositions[i3 + 2] = Math.sin(angle) * radius + g1 * scatterScale * 0.42;

      const tNorm = Math.min(1, radius / 13.5);
      if (tNorm < 0.2) {
        tmpCol.copy(colCore).lerp(colArmWarm, tNorm / 0.2);
      } else if (tNorm < 0.58) {
        tmpCol.copy(colArmWarm).lerp(colArmMid, (tNorm - 0.2) / 0.38);
      } else {
        tmpCol.copy(colArmMid).lerp(colOuter, (tNorm - 0.58) / 0.42);
      }
      gColors[i3] = tmpCol.r;
      gColors[i3 + 1] = tmpCol.g;
      gColors[i3 + 2] = tmpCol.b;

      gSizes[i] = isCore
        ? 1.5 + Math.pow(Math.random(), 2.0) * 3.8
        : 0.9 + Math.pow(Math.random(), 2.4) * 3.4;
      gPhases[i] = Math.random();
      gRadii[i] = radius;
    }

    const galaxyGeo = new THREE.BufferGeometry();
    galaxyGeo.setAttribute("position", new THREE.BufferAttribute(gPositions, 3));
    galaxyGeo.setAttribute("aColor", new THREE.BufferAttribute(gColors, 3));
    galaxyGeo.setAttribute("aSize", new THREE.BufferAttribute(gSizes, 1));
    galaxyGeo.setAttribute("aPhase", new THREE.BufferAttribute(gPhases, 1));
    galaxyGeo.setAttribute("aArmRadius", new THREE.BufferAttribute(gRadii, 1));

    const galaxyUniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: dpr },
      uCursorWorld: { value: new THREE.Vector3(0, 0, -10.2) },
    };

    const galaxyMat = new THREE.ShaderMaterial({
      vertexShader: GALAXY_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: galaxyUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const galaxyPoints = new THREE.Points(galaxyGeo, galaxyMat);
    galaxyPlane.add(galaxyPoints);

    // Rich volumetric galactic core & spiral-arm nebula clouds
    const nebulaWarmTex = createNebulaGlowTexture(true);
    const nebulaCoolTex = createNebulaGlowTexture(false);
    const nebulaSprites: THREE.Sprite[] = [];
    const nebulaMats: THREE.SpriteMaterial[] = [];
    for (let n = 0; n < 38; n++) {
      const isCenter = n < 6;
      const armA = ((n % ARMS) / ARMS) * Math.PI * 2;
      const rad = isCenter ? n * 0.35 : 1.6 + ((n - 6) / 32) * 10.2;
      const ang = armA + rad * 0.52;
      const sMat = new THREE.SpriteMaterial({
        map: isCenter || n % 3 === 0 ? nebulaWarmTex : nebulaCoolTex,
        transparent: true,
        opacity: isCenter ? 0.28 : 0.14,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      nebulaMats.push(sMat);
      const sp = new THREE.Sprite(sMat);
      sp.position.set(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.45, Math.sin(ang) * rad);
      const sc = isCenter ? 5.8 : 3.6 + Math.random() * 2.8;
      sp.scale.set(sc, sc, 1);
      galaxyPlane.add(sp);
      nebulaSprites.push(sp);
    }

    // Deep-space multi-depth ambient starfield
    const FIELD_COUNT = 2600;
    const fPos = new Float32Array(FIELD_COUNT * 3);
    const fCol = new Float32Array(FIELD_COUNT * 3);
    const fSizes = new Float32Array(FIELD_COUNT);
    const fPhases = new Float32Array(FIELD_COUNT);

    for (let i = 0; i < FIELD_COUNT; i++) {
      const i3 = i * 3;
      fPos[i3] = (Math.random() - 0.5) * 38;
      fPos[i3 + 1] = (Math.random() - 0.5) * 26;
      fPos[i3 + 2] = -5.5 - Math.random() * 22;
      tmpCol.copy(colArmWarm).lerp(colArmMid, Math.random() * 0.75);
      fCol[i3] = tmpCol.r * 0.92;
      fCol[i3 + 1] = tmpCol.g * 0.92;
      fCol[i3 + 2] = tmpCol.b * 0.92;
      fSizes[i] = 0.7 + Math.pow(Math.random(), 2.6) * 2.4;
      fPhases[i] = Math.random();
    }

    const fieldGeo = new THREE.BufferGeometry();
    fieldGeo.setAttribute("position", new THREE.BufferAttribute(fPos, 3));
    fieldGeo.setAttribute("aColor", new THREE.BufferAttribute(fCol, 3));
    fieldGeo.setAttribute("aSize", new THREE.BufferAttribute(fSizes, 1));
    fieldGeo.setAttribute("aPhase", new THREE.BufferAttribute(fPhases, 1));

    const starFieldMat = new THREE.ShaderMaterial({
      vertexShader: STARFIELD_VERT,
      fragmentShader: GALAXY_FRAG,
      uniforms: galaxyUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const starField = new THREE.Points(fieldGeo, starFieldMat);
    scene.add(starField);

    /* ---- 2. 3D Monument Group: Rotating Celestial Globe + Watertight 3D Atlas ---- */
    const monumentGroup = new THREE.Group();
    scene.add(monumentGroup);

    const texLoader = new THREE.TextureLoader();

    const globeTex = texLoader.load("/assets/celestial-globe-map.jpg?v=4");
    globeTex.colorSpace = THREE.SRGBColorSpace;
    globeTex.anisotropy = 8;

    const globeGeo = new THREE.SphereGeometry(R_GLOBE, 96, 96);
    const globeMat = new THREE.MeshStandardMaterial({
      map: globeTex,
      bumpMap: globeTex,
      bumpScale: 0.048,
      roughness: 0.52,
      metalness: 0.07,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeMesh.position.set(GLOBE_X, GLOBE_Y, GLOBE_Z);
    globeMesh.rotation.z = 0.18;
    globeMesh.userData = { pillarKey: "atlas" };
    monumentGroup.add(globeMesh);

    // Subtle spherical Fresnel atmospheric rim on the 3D globe (no lines!)
    const globeRimGeo = new THREE.SphereGeometry(R_GLOBE * 1.022, 64, 64);
    const globeRimMat = new THREE.ShaderMaterial({
      vertexShader: GLOBE_RIM_VERT,
      fragmentShader: GLOBE_RIM_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.FrontSide,
    });
    const globeRimMesh = new THREE.Mesh(globeRimGeo, globeRimMat);
    globeRimMesh.position.set(GLOBE_X, GLOBE_Y, GLOBE_Z);
    monumentGroup.add(globeRimMesh);

    let statueHitMesh: THREE.Mesh | null = null;
    let statueNormalTex: THREE.DataTexture | null = null;
    let statueAlbedoTex: THREE.Texture | null = null;
    texLoader.load("/assets/atlas-body-3d.png?v=4", (albedoTex) => {
      if (disposed) {
        albedoTex.dispose();
        return;
      }
      statueAlbedoTex = albedoTex;
      albedoTex.colorSpace = THREE.SRGBColorSpace;
      albedoTex.anisotropy = 8;
      void buildSculptedAtlasMesh(albedoTex).then(({ group, hitMesh, normalTex }) => {
        if (disposed) {
          normalTex.dispose();
          hitMesh.geometry.dispose();
          return;
        }
        statueHitMesh = hitMesh;
        statueNormalTex = normalTex;
        monumentGroup.add(group);
      });
    });

    /* ---- 3. Six Orbiting 3D Spheres (ZERO visible orbit lines!) ---- */
    const orbMeshes: THREE.Mesh[] = [];
    const orbMaps: THREE.Texture[] = [];
    const orbBumpMaps: THREE.Texture[] = [];
    const orbMaterials: THREE.MeshStandardMaterial[] = [];
    const orbPhaseAngles = PILLARS.map((p) => p.orbit.phase);

    PILLARS.forEach((p, i) => {
      const { map, bumpMap } = createPillarOrbTextures(p);
      orbMaps.push(map);
      orbBumpMaps.push(bumpMap);

      const mat = new THREE.MeshStandardMaterial({
        map,
        bumpMap,
        bumpScale: 0.024,
        roughness: 0.42,
        metalness: 0.08,
        emissive: new THREE.Color("#F5E8D3"),
        emissiveIntensity: 0.0,
      });
      orbMaterials.push(mat);

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(R_ORB, 56, 56), mat);
      mesh.rotation.z = ((i % 2 === 0 ? 1 : -1) * 14 * Math.PI) / 180;
      mesh.userData = { pillarIndex: i, pillarKey: p.key };
      monumentGroup.add(mesh);
      orbMeshes.push(mesh);
    });

    /* ---- Cursor Tracking, Drag Turntable & 3D Raycasting ---- */
    const pointerTarget = { x: 0, y: 0 };
    const pointerSmooth = { x: 0, y: 0 };
    const pointerNdc = new THREE.Vector2(-99, -99);
    const raycaster = new THREE.Raycaster();
    let pointerInside = false;
    let isDragging = false;
    let dragMoved = false;
    let dragStartX = 0;
    let dragYawOffset = 0;

    const updatePointerFromClient = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((clientY - rect.top) / rect.height) * 2 - 1);
      pointerTarget.x = Math.max(-1, Math.min(1, nx));
      pointerTarget.y = Math.max(-1, Math.min(1, ny));
      pointerNdc.set(pointerTarget.x, pointerTarget.y);
      pointerInside = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragMoved = false;
      dragStartX = e.clientX;
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const dx = e.clientX - dragStartX;
        if (Math.abs(dx) > 5) dragMoved = true;
        dragStartX = e.clientX;
        dragYawOffset = Math.max(-0.48, Math.min(0.48, dragYawOffset + dx * 0.0045));
      }
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const onPointerLeave = () => {
      isDragging = false;
      pointerInside = false;
      pointerNdc.set(-99, -99);
      hoveredKeyRef.current = null;
      container.style.cursor = "default";
    };

    const pickSphereAt = (clientX: number, clientY: number): Pillar | null => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return null;
      const ndc = new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -(((clientY - rect.top) / rect.height) * 2 - 1)
      );
      raycaster.setFromCamera(ndc, camera);
      const targets: THREE.Object3D[] = [...orbMeshes, globeMesh];
      if (statueHitMesh) targets.push(statueHitMesh);
      const hits = raycaster.intersectObjects(targets, false);
      if (!hits.length) return null;
      const first = hits[0].object;
      if (first === statueHitMesh) return null;
      const key = first.userData?.pillarKey as string | undefined;
      return PILLARS.find((p) => p.key === key) ?? null;
    };

    const onClickCanvas = (e: MouseEvent) => {
      if (dragMoved) {
        dragMoved = false;
        return;
      }
      const picked = pickSphereAt(e.clientX, e.clientY);
      if (picked) openPillar(picked);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });
    container.addEventListener("pointerleave", onPointerLeave);
    renderer.domElement.addEventListener("click", onClickCanvas);

    /* ---- Resize Handling ---- */
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    window.addEventListener("resize", onResize);

    /* ---- Animation Loop ---- */
    let raf = 0;
    let prevTime = performance.now();
    const globeWorldCenter = new THREE.Vector3();
    const orbWorldPos = new THREE.Vector3();
    const projVec = new THREE.Vector3();
    const rayDir = new THREE.Vector3();
    const toGlobe = new THREE.Vector3();

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;
      const elapsed = now / 1000;

      const damp = 1 - Math.exp(-dt * 5.8);
      pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * damp;
      pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * damp;
      if (!isDragging) {
        dragYawOffset *= Math.exp(-dt * 1.4);
      }

      // 1. Moving 3D Spiral Space Galaxy following cursor across screen
      galaxyUniforms.uTime.value = elapsed;
      galaxyPlane.rotation.y = elapsed * 0.09;

      starField.position.x = pointerSmooth.x * 1.85;
      starField.position.y = pointerSmooth.y * 1.35;

      galaxyAnchor.position.x = pointerSmooth.x * 4.2;
      galaxyAnchor.position.y = 0.35 + pointerSmooth.y * 2.75;
      galaxyPlane.rotation.x = 0.68 - pointerSmooth.y * 0.3;
      galaxyPlane.rotation.z = -0.28 - pointerSmooth.x * 0.32;

      galaxyUniforms.uCursorWorld.value.set(
        pointerSmooth.x * 6.8,
        pointerSmooth.y * 4.6,
        -10.2
      );

      // 2. Unmistakable 3D turntable rotation & camera parallax on the 3D Atlas statue + Globe
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const baseZ = getBaseCamZ(w, h);
      camera.position.x = pointerSmooth.x * 0.72;
      camera.position.y = 0.18 + pointerSmooth.y * 0.42;
      camera.position.z = baseZ;
      camera.lookAt(0, 0.08, 0);

      // Gentle autonomous 3D sculptural sway + responsive 3D cursor/drag turntable
      const idleSwayY = Math.sin(elapsed * 0.52) * 0.14;
      const idleSwayX = Math.cos(elapsed * 0.37) * 0.03;
      monumentGroup.rotation.y = idleSwayY + pointerSmooth.x * 0.28 + dragYawOffset;
      monumentGroup.rotation.x = idleSwayX - pointerSmooth.y * 0.09;

      cursorLight.position.set(
        pointerSmooth.x * 4.8,
        1.5 + pointerSmooth.y * 3.1,
        4.6
      );

      // Rotate the 3D Celestial Globe cradled in Atlas's sculpted hands
      globeMesh.rotation.y = elapsed * 0.24;

      const aspect = w / h;
      const orbitWidthScale = aspect < 0.65 ? 0.72 : aspect < 0.95 ? 0.88 : 1.0;

      // 3. Advance all 6 orbiting 3D spheres along their invisible 3D orbits
      PILLARS.forEach((p, i) => {
        const isHovered = hoveredKeyRef.current === p.key;
        const speedFactor = isHovered ? 0.25 : 1.0;
        orbPhaseAngles[i] += (dt * Math.PI * 2 * speedFactor) / p.orbit.period;

        const theta = orbPhaseAngles[i];
        const rx = p.orbit.rx * orbitWidthScale;
        const rz = p.orbit.rz;

        const x0 = rx * Math.cos(theta);
        const z0 = rz * Math.sin(theta);

        const pitch = (p.orbit.pitchX * Math.PI) / 180;
        const y1 = -z0 * Math.sin(pitch);
        const z1 = z0 * Math.cos(pitch);

        const tilt = (p.orbit.tiltZ * Math.PI) / 180;
        const x2 = x0 * Math.cos(tilt) - y1 * Math.sin(tilt);
        const y2 = x0 * Math.sin(tilt) + y1 * Math.cos(tilt);

        const mesh = orbMeshes[i];
        mesh.position.set(GLOBE_X + x2, GLOBE_Y + p.orbit.liftY + y2, GLOBE_Z + z1);
        mesh.rotation.y += dt * (1.15 + i * 0.14);

        const targetScale = isHovered ? 1.26 : 1.0;
        const curScale = mesh.scale.x + (targetScale - mesh.scale.x) * Math.min(1, dt * 12);
        mesh.scale.setScalar(curScale);
        orbMaterials[i].emissiveIntensity = isHovered ? 0.22 : 0.0;
      });

      scene.updateMatrixWorld();

      if (pointerInside && !isDragging) {
        raycaster.setFromCamera(pointerNdc, camera);
        const targets: THREE.Object3D[] = [...orbMeshes, globeMesh];
        if (statueHitMesh) targets.push(statueHitMesh);
        const hits = raycaster.intersectObjects(targets, false);
        if (hits.length > 0 && hits[0].object !== statueHitMesh) {
          const hitObj = hits[0].object;
          const hitKey = (hitObj.userData?.pillarKey as string) || null;
          hoveredKeyRef.current = hitKey;
          container.style.cursor = hitKey ? "pointer" : "default";
        } else {
          hoveredKeyRef.current = null;
          container.style.cursor = "default";
        }
      }

      // Project floating labels & fade them out completely when occluded behind the 3D globe/statue
      globeMesh.getWorldPosition(globeWorldCenter);

      PILLARS.forEach((p, i) => {
        const labelEl = labelRefs.current[i];
        if (!labelEl) return;

        const mesh = orbMeshes[i];
        mesh.getWorldPosition(orbWorldPos);

        let visibility = 1.0;
        if (orbWorldPos.z < globeWorldCenter.z) {
          rayDir.subVectors(orbWorldPos, camera.position);
          const distToOrb = rayDir.length();
          rayDir.divideScalar(Math.max(1e-5, distToOrb));

          toGlobe.subVectors(globeWorldCenter, camera.position);
          const tProj = toGlobe.dot(rayDir);
          if (tProj > 0 && tProj < distToOrb) {
            const perpSq = Math.max(0, toGlobe.lengthSq() - tProj * tProj);
            const perpDist = Math.sqrt(perpSq);
            const outerEdge = R_GLOBE + R_ORB * 0.9;
            const innerEdge = R_GLOBE - R_ORB * 0.25;
            const globeVis = Math.max(
              0,
              Math.min(1, (perpDist - innerEdge) / Math.max(0.01, outerEdge - innerEdge))
            );
            visibility = Math.min(visibility, globeVis);
          }

          if (orbWorldPos.y < globeWorldCenter.y && orbWorldPos.y > STATUE_CENTER_Y - STATUE_H * 0.45) {
            const xDist = Math.abs(orbWorldPos.x - globeWorldCenter.x);
            const torsoVis = Math.max(0, Math.min(1, (xDist - 0.72) / 0.36));
            visibility = Math.min(visibility, torsoVis);
          }
        }

        projVec.copy(orbWorldPos);
        projVec.y -= R_ORB * 1.44 * mesh.scale.y;
        projVec.project(camera);

        const sx = (projVec.x * 0.5 + 0.5) * w;
        const sy = (-projVec.y * 0.5 + 0.5) * h;
        const isHovered = hoveredKeyRef.current === p.key;

        // Subtle depth scale on label matching 3D proximity
        const depthFactor = Math.max(0.82, Math.min(1.12, 1 + (orbWorldPos.z - globeWorldCenter.z) * 0.06));
        labelEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, 0) scale(${(
          (isHovered ? 1.1 : depthFactor) *
          (0.9 + visibility * 0.1)
        ).toFixed(3)})`;
        labelEl.style.opacity = String(Number((visibility * (isHovered ? 1 : 0.94)).toFixed(3)));
        labelEl.style.pointerEvents = visibility > 0.45 ? "auto" : "none";
      });

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };

    raf = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onClickCanvas);

      galaxyGeo.dispose();
      fieldGeo.dispose();
      galaxyMat.dispose();
      starFieldMat.dispose();
      nebulaWarmTex.dispose();
      nebulaCoolTex.dispose();
      nebulaMats.forEach((m) => m.dispose());
      nebulaSprites.length = 0;
      globeGeo.dispose();
      globeMat.dispose();
      globeRimGeo.dispose();
      globeRimMat.dispose();
      globeTex.dispose();
      statueAlbedoTex?.dispose();
      statueNormalTex?.dispose();
      statueHitMesh?.geometry.dispose();
      orbMeshes.forEach((m) => m.geometry.dispose());
      orbMaterials.forEach((m) => m.dispose());
      orbMaps.forEach((t) => t.dispose());
      orbBumpMaps.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [openPillar]);

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden bg-[#07080E] select-none">
      {/* 3D WebGL Canvas (Space Galaxy + Watertight 3D Atlas + 3D Globe + 6 3D Orbiting Spheres) */}
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      {/* 3D-projected sphere labels (automatically disappear when occluded behind the 3D globe) */}
      <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
        {PILLARS.map((p, i) => (
          <button
            key={p.key}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            type="button"
            onClick={() => openPillar(p)}
            onMouseEnter={() => {
              hoveredKeyRef.current = p.key;
            }}
            onMouseLeave={() => {
              if (hoveredKeyRef.current === p.key) hoveredKeyRef.current = null;
            }}
            onFocus={() => {
              hoveredKeyRef.current = p.key;
            }}
            onBlur={() => {
              if (hoveredKeyRef.current === p.key) hoveredKeyRef.current = null;
            }}
            aria-label={`Open ${p.name}`}
            style={{ opacity: 0 }}
            className="absolute left-0 top-0 cursor-pointer whitespace-nowrap rounded-pill border-2 border-marble/80 bg-wine/90 px-3.5 py-0.5 font-ui text-[15px] uppercase tracking-[0.15em] text-marble shadow-md backdrop-blur-sm transition-colors hover:bg-marble hover:text-wine focus-visible:opacity-100 focus-visible:ring-4 focus-visible:ring-marble"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Doorway transition when a 3D sphere is pressed */}
      {opening && (
        <div className="pointer-events-none fixed inset-0 z-[900] grid place-items-center anim-fade bg-wine/95">
          <div className="text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={opening.image}
              alt=""
              className="mx-auto h-28 w-28 rounded-full border-[3px] border-marble object-cover"
            />
            <p className="mt-5 font-display text-[clamp(34px,6.8vw,64px)] tracking-[0.2em] text-marble">
              {opening.name.toUpperCase()}
            </p>
            <p className="mt-2 font-body text-[21px] italic tracking-[0.18em] text-marble opacity-75">
              {opening.greek}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
