"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";

/* ------------------------------------------------------------------ */
/*  AtlasStage — Full-viewport 3D Sanctuary                           */
/*  • Moving 3D spiral space galaxy background that follows cursor    */
/*  • 3D sculpted marble Atlas statue + rotating 3D celestial globe   */
/*  • 6 spinning 3D spheres orbiting in 3D around the globe, visibly  */
/*    slipping behind the globe & disappearing (no visible orbit      */
/*    lines)                                                          */
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
    orbit: { rx: 1.68, rz: 1.58, tiltZ: -18, pitchX: 6, liftY: 0.08, period: 16, phase: 0.25 },
  },
  {
    key: "study",
    name: "Study",
    greek: "Μάθησις",
    href: "/study",
    image: "/assets/emblems/study.png",
    blurb: "Timetable, courses, assignments, exams and self-learning.",
    orbit: { rx: 2.1, rz: 1.86, tiltZ: 15, pitchX: -5, liftY: -0.18, period: 20, phase: 1.38 },
  },
  {
    key: "people",
    name: "People",
    greek: "Ἄνθρωποι",
    href: "/people",
    image: "/assets/emblems/people.png",
    blurb: "Everyone who matters — dates, promises, gifts, check-ins.",
    orbit: { rx: 1.86, rz: 1.72, tiltZ: 24, pitchX: 5, liftY: 0.22, period: 18, phase: 2.58 },
  },
  {
    key: "life",
    name: "Life",
    greek: "Βίος",
    href: "/life",
    image: "/assets/emblems/life.png",
    blurb: "Health, money, habits and the 1–5 of how you actually feel.",
    orbit: { rx: 2.3, rz: 1.98, tiltZ: -23, pitchX: -6, liftY: -0.12, period: 22, phase: 3.78 },
  },
  {
    key: "memories",
    name: "Memories",
    greek: "Μνῆμαι",
    href: "/memories",
    image: "/assets/emblems/memories.png",
    blurb: "Every log, journal and milestone — the timeline of you.",
    orbit: { rx: 2.54, rz: 2.14, tiltZ: 8, pitchX: 4, liftY: 0.26, period: 25, phase: 4.88 },
  },
  {
    key: "atlas",
    name: "Atlas AI",
    greek: "Ὁ Τιτάν",
    href: "/atlas",
    image: "/icons/icon-192.png",
    blurb: "Speak with the Titan AI that weighs and plans your world.",
    orbit: { rx: 1.54, rz: 1.5, tiltZ: -9, pitchX: -5, liftY: -0.2, period: 15, phase: 5.72 },
  },
];

/* Exact 3D monument proportions calibrated to atlas-body-3d.png (768x1152) */
const STATUE_H = 6.6;
const STATUE_W = (STATUE_H * 2) / 3; // 4.4
const STATUE_CENTER_Y = -0.34;
const GLOBE_X = (0.50371 - 0.5) * STATUE_W;
const GLOBE_Y = STATUE_CENTER_Y + (0.5 - 0.19141) * STATUE_H;
const GLOBE_Z = 0.0;
const R_GLOBE = 0.2293 * STATUE_W * 1.012; // ~1.021
const R_ORB = 0.245;

/* ------------------------------------------------------------------ */
/*  Custom GLSL shaders for the 3D Spiral Space Galaxy & Starfield    */
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

  // Differential galactic swirl: inner core stars orbit faster than outer spiral arms
  float swirl = uTime * (0.06 + 0.18 / (0.65 + aArmRadius * 0.28));
  float cs = cos(swirl);
  float sn = sin(swirl);
  vec2 spun = vec2(pos.x * cs - pos.z * sn, pos.x * sn + pos.z * cs);
  pos.x = spun.x;
  pos.z = spun.y;
  pos.y += sin(uTime * 0.55 + aPhase * 6.2831) * 0.09;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);

  // Cosmic attraction + luminescence wake following the cursor across space
  vec2 toCursor = uCursorWorld.xy - worldPos.xy;
  float cDist = length(toCursor);
  float wake = exp(-cDist * cDist * 0.075);
  worldPos.xy += toCursor * (wake * 0.24);
  worldPos.z += wake * 0.55;

  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.76 + 0.24 * sin(uTime * 2.2 + aPhase * 6.2831);
  vColor = mix(aColor, vec3(0.99, 0.95, 0.88), wake * 0.65);
  vAlpha = clamp(twinkle + wake * 0.45, 0.0, 1.0);

  float sizeAtten = (215.0 * uPixelRatio) / max(1.5, -mvPosition.z);
  gl_PointSize = clamp(aSize * sizeAtten * (1.0 + wake * 0.55), 1.0, 52.0);
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
  // Gentle continuous cosmic drift in deep background space (always behind z = -5)
  pos.x += sin(uTime * 0.12 + aPhase * 6.2831) * 0.45;
  pos.y += cos(uTime * 0.10 + aPhase * 9.4247) * 0.35;

  vec4 worldPos = modelMatrix * vec4(pos, 1.0);
  vec2 toCursor = uCursorWorld.xy - worldPos.xy;
  float wake = exp(-dot(toCursor, toCursor) * 0.06);
  worldPos.xy += toCursor * (wake * 0.18);

  vec4 mvPosition = viewMatrix * worldPos;
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.68 + 0.32 * sin(uTime * 2.6 + aPhase * 12.566);
  vColor = mix(aColor, vec3(0.98, 0.94, 0.86), wake * 0.5);
  vAlpha = clamp(twinkle + wake * 0.35, 0.0, 1.0);

  float sizeAtten = (195.0 * uPixelRatio) / max(2.0, -mvPosition.z);
  gl_PointSize = clamp(aSize * sizeAtten, 1.0, 32.0);
}
`;

const GALAXY_FRAG = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - vec2(0.5);
  float d = length(uv) * 2.0;
  if (d > 1.0) discard;

  float core = exp(-d * d * 7.5);
  float halo = pow(max(0.0, 1.0 - d), 2.4) * 0.48;
  float strength = clamp(core + halo, 0.0, 1.0);

  gl_FragColor = vec4(vColor * (0.85 + core * 0.45), strength * vAlpha);
}
`;

function createNebulaGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = s;
  c.height = s;
  const ctx = c.getContext("2d")!;
  const grad = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, "rgba(255, 244, 224, 0.55)");
  grad.addColorStop(0.35, "rgba(216, 198, 174, 0.22)");
  grad.addColorStop(0.7, "rgba(110, 124, 165, 0.07)");
  grad.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/* ------------------------------------------------------------------ */
/*  Build spherical texture for each orbiting 3D pillar sphere        */
/* ------------------------------------------------------------------ */

function createPillarOrbTexture(pillar: Pillar, onUpdate: () => void): THREE.CanvasTexture {
  const cw = 512;
  const ch = 256;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d")!;

  const drawBase = (emblem?: HTMLImageElement) => {
    ctx.fillStyle = "#F5E8D3";
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = "rgba(40, 40, 42, 0.22)";
    ctx.lineWidth = 1.5;
    for (let lat = 1; lat < 6; lat++) {
      const y = (lat / 6) * ch;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    for (let lon = 0; lon < 8; lon++) {
      const x = (lon / 8) * cw;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(40, 40, 42, 0.42)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, ch / 2);
    ctx.lineTo(cw, ch / 2);
    ctx.stroke();

    if (emblem) {
      const rMed = 58;
      for (const cx of [cw * 0.25, cw * 0.75]) {
        const cy = ch * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, rMed + 4, 0, Math.PI * 2);
        ctx.fillStyle = "#28282A";
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, rMed, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "#F5E8D3";
        ctx.fillRect(cx - rMed, cy - rMed, rMed * 2, rMed * 2);
        ctx.drawImage(emblem, cx - rMed, cy - rMed, rMed * 2, rMed * 2);
        ctx.restore();
      }
    }
  };

  drawBase();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 4;

  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    drawBase(img);
    tex.needsUpdate = true;
    onUpdate();
  };
  img.src = pillar.image;

  return tex;
}

/* ------------------------------------------------------------------ */
/*  Build volumetric 3D high-relief marble mesh for Atlas statue      */
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
    im.src = "/assets/atlas-body-depth.png";
  });

  const albedoImg = albedoTex.image as HTMLImageElement;
  const gw = 192;
  const gh = 288;

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

  const globeClearRadiusSq = (R_GLOBE + 0.04) * (R_GLOBE + 0.04);

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

      if (alpha > 0.025) validVert[idx] = 1;

      // Exact 3D sphere clearance so Atlas's laurel-crowned head, shoulders & clasping fingers
      // always wrap cleanly OVER the front curvature of the rotating 3D Celestial Globe
      const dxG = xWorld - GLOBE_X;
      const dyG = yWorld - GLOBE_Y;
      const rSqG = dxG * dxG + dyG * dyG;
      const sphereSurfaceZ =
        rSqG < globeClearRadiusSq ? Math.sqrt(globeClearRadiusSq - rSqG) + 0.035 : 0;

      const headEnv =
        Math.exp(-Math.pow((xImg - 532) / 118, 2) - Math.pow((yImg - 465) / 115, 2)) * 0.58;
      const shoulderEnv =
        Math.exp(-Math.pow((xImg - 516) / 235, 2) - Math.pow((yImg - 535) / 95, 2)) * 0.44;
      const kneeEnv =
        Math.exp(-Math.pow((xImg - 635) / 115, 2) - Math.pow((yImg - 1025) / 210, 2)) * 0.36;
      const torsoEnv =
        Math.exp(-Math.pow((xImg - 505) / 185, 2) - Math.pow((yImg - 740) / 245, 2)) * 0.32;

      const outerTaper = sphereSurfaceZ > 0 ? 1.0 : Math.min(1, alpha * 1.9);
      const baseSculptZ =
        (0.14 + hNorm * 0.68 + headEnv + shoulderEnv + kneeEnv + torsoEnv) * outerTaper;
      const zFront = Math.max(baseSculptZ, sphereSurfaceZ > 0 ? sphereSurfaceZ + hNorm * 0.14 : 0);
      const zBack = -0.24 - hNorm * 0.38 * outerTaper;

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

  const indices: number[] = [];
  for (let r = 0; r < vRows - 1; r++) {
    for (let c = 0; c < vCols - 1; c++) {
      const i00 = r * vCols + c;
      const i10 = i00 + 1;
      const i01 = i00 + vCols;
      const i11 = i01 + 1;
      if (validVert[i00] && validVert[i10] && validVert[i01] && validVert[i11]) {
        indices.push(i00, i01, i10, i10, i01, i11);
        const b00 = totalFront + i00;
        const b10 = totalFront + i10;
        const b01 = totalFront + i01;
        const b11 = totalFront + i11;
        indices.push(b00, b10, b01, b10, b11, b01);
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
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughness: 0.55,
    metalness: 0.05,
    alphaTest: 0.16,
    transparent: false,
    side: THREE.FrontSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  group.add(mesh);

  // Volumetric 3D cylindrical marble plinth backing
  const plinthGeo = new THREE.CylinderGeometry(1.26, 1.36, 0.72, 64);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#C9B9A1"),
    roughness: 0.65,
    metalness: 0.05,
  });
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.position.set(0.02, STATUE_CENTER_Y - STATUE_H * 0.5 + 0.42, -0.32);
  group.add(plinth);

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
    renderer.toneMappingExposure = 1.06;
    renderer.setClearColor(new THREE.Color("#08080C"), 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2("#08080C", 0.012);

    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      120
    );
    const getBaseCamZ = (w: number, h: number) => {
      const aspect = w / Math.max(1, h);
      if (aspect < 0.65) return 11.4;
      if (aspect < 0.95) return 10.2;
      return 9.2;
    };
    camera.position.set(0, 0.14, getBaseCamZ(container.clientWidth, container.clientHeight));
    camera.lookAt(0, 0.12, 0);

    /* ---- Sculptural 3D Lighting ---- */
    const ambient = new THREE.AmbientLight("#F5E8D3", 0.68);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight("#FFF5E4", 1.55);
    keyLight.position.set(2.8, 5.2, 6.4);
    scene.add(keyLight);

    const rimLightLeft = new THREE.DirectionalLight("#E6D5BA", 0.72);
    rimLightLeft.position.set(-5.5, 2.4, -2.8);
    scene.add(rimLightLeft);

    const rimLightRight = new THREE.DirectionalLight("#D6DEEE", 0.52);
    rimLightRight.position.set(5.2, -1.2, -3.2);
    scene.add(rimLightRight);

    const cursorLight = new THREE.PointLight("#F5E8D3", 2.4, 14, 1.6);
    cursorLight.position.set(0, 1.6, 4.6);
    scene.add(cursorLight);

    /* ---- 1. Moving 3D Spiral Space Galaxy Background ---- */
    const galaxyAnchor = new THREE.Group();
    galaxyAnchor.position.set(0, 0.35, -16.5);
    scene.add(galaxyAnchor);

    const galaxyPlane = new THREE.Group();
    galaxyPlane.rotation.set(0.66, 0.0, -0.26);
    galaxyAnchor.add(galaxyPlane);

    const STAR_COUNT = 9200;
    const gPositions = new Float32Array(STAR_COUNT * 3);
    const gColors = new Float32Array(STAR_COUNT * 3);
    const gSizes = new Float32Array(STAR_COUNT);
    const gPhases = new Float32Array(STAR_COUNT);
    const gRadii = new Float32Array(STAR_COUNT);

    const colCore = new THREE.Color("#FFF2DC");
    const colArmWarm = new THREE.Color("#F5E8D3");
    const colArmMid = new THREE.Color("#C7CEE0");
    const colOuter = new THREE.Color("#7B86A6");
    const tmpCol = new THREE.Color();

    const ARMS = 4;
    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const isCore = i < 1500;
      const u = Math.random();
      const radius = isCore ? Math.pow(u, 1.8) * 3.2 : 0.8 + Math.pow(u, 0.82) * 15.8;

      const armAngle = ((i % ARMS) / ARMS) * Math.PI * 2;
      const spiralTwist = radius * 0.46;
      const scatterScale = isCore ? 0.55 : 0.32 + radius * 0.085;

      const g1 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);
      const g2 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);
      const g3 =
        Math.sqrt(-2 * Math.log(Math.max(1e-6, Math.random()))) *
        Math.cos(Math.random() * Math.PI * 2);

      const angle = armAngle + spiralTwist + g1 * (isCore ? 0.9 : 0.26);
      gPositions[i3] = Math.cos(angle) * radius + g2 * scatterScale * 0.45;
      gPositions[i3 + 1] = g3 * (isCore ? 0.52 : 0.24 + radius * 0.03);
      gPositions[i3 + 2] = Math.sin(angle) * radius + g1 * scatterScale * 0.45;

      const tNorm = Math.min(1, radius / 15.8);
      if (tNorm < 0.18) {
        tmpCol.copy(colCore).lerp(colArmWarm, tNorm / 0.18);
      } else if (tNorm < 0.58) {
        tmpCol.copy(colArmWarm).lerp(colArmMid, (tNorm - 0.18) / 0.4);
      } else {
        tmpCol.copy(colArmMid).lerp(colOuter, (tNorm - 0.58) / 0.42);
      }
      gColors[i3] = tmpCol.r;
      gColors[i3 + 1] = tmpCol.g;
      gColors[i3 + 2] = tmpCol.b;

      gSizes[i] = isCore
        ? 1.4 + Math.pow(Math.random(), 2.2) * 3.6
        : 0.75 + Math.pow(Math.random(), 2.8) * 3.1;
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
      uCursorWorld: { value: new THREE.Vector3(0, 0, -16.5) },
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

    // Soft volumetric galactic nebula clouds along the core & spiral arms
    const nebulaTex = createNebulaGlowTexture();
    const nebulaSprites: THREE.Sprite[] = [];
    const nebulaMats: THREE.SpriteMaterial[] = [];
    for (let n = 0; n < 24; n++) {
      const isCenter = n < 4;
      const armA = ((n % ARMS) / ARMS) * Math.PI * 2;
      const rad = isCenter ? n * 0.45 : 2.2 + ((n - 4) / 20) * 10.5;
      const ang = armA + rad * 0.46;
      const sMat = new THREE.SpriteMaterial({
        map: nebulaTex,
        color: isCenter ? new THREE.Color("#F5E8D3") : new THREE.Color("#9AA6C4"),
        transparent: true,
        opacity: isCenter ? 0.16 : 0.075,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      nebulaMats.push(sMat);
      const sp = new THREE.Sprite(sMat);
      sp.position.set(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.5, Math.sin(ang) * rad);
      const sc = isCenter ? 6.5 : 4.2 + Math.random() * 3.2;
      sp.scale.set(sc, sc, 1);
      galaxyPlane.add(sp);
      nebulaSprites.push(sp);
    }

    // Deep-space multi-depth starfield (separate non-orbiting shader so stars stay behind z = -5)
    const FIELD_COUNT = 2200;
    const fPos = new Float32Array(FIELD_COUNT * 3);
    const fCol = new Float32Array(FIELD_COUNT * 3);
    const fSizes = new Float32Array(FIELD_COUNT);
    const fPhases = new Float32Array(FIELD_COUNT);

    for (let i = 0; i < FIELD_COUNT; i++) {
      const i3 = i * 3;
      fPos[i3] = (Math.random() - 0.5) * 44;
      fPos[i3 + 1] = (Math.random() - 0.5) * 30;
      fPos[i3 + 2] = -6 - Math.random() * 26;
      const warmMix = Math.random();
      tmpCol.copy(colArmWarm).lerp(colArmMid, warmMix * 0.7);
      fCol[i3] = tmpCol.r * 0.85;
      fCol[i3 + 1] = tmpCol.g * 0.85;
      fCol[i3 + 2] = tmpCol.b * 0.85;
      fSizes[i] = 0.55 + Math.pow(Math.random(), 3) * 2.1;
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

    /* ---- 2. Monument Group: Rotating 3D Celestial Globe + 3D Atlas Statue ---- */
    const monumentGroup = new THREE.Group();
    scene.add(monumentGroup);

    const texLoader = new THREE.TextureLoader();

    const globeTex = texLoader.load("/assets/celestial-globe-map.jpg");
    globeTex.colorSpace = THREE.SRGBColorSpace;
    globeTex.anisotropy = 8;

    const globeGeo = new THREE.SphereGeometry(R_GLOBE, 96, 96);
    const globeMat = new THREE.MeshStandardMaterial({
      map: globeTex,
      bumpMap: globeTex,
      bumpScale: 0.022,
      roughness: 0.54,
      metalness: 0.06,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeMesh.position.set(GLOBE_X, GLOBE_Y, GLOBE_Z);
    globeMesh.rotation.z = 0.18;
    globeMesh.userData = { pillarKey: "atlas" };
    monumentGroup.add(globeMesh);

    let statueHitMesh: THREE.Mesh | null = null;
    let statueNormalTex: THREE.DataTexture | null = null;
    let statueAlbedoTex: THREE.Texture | null = null;
    texLoader.load("/assets/atlas-body-3d.png", (albedoTex) => {
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

    /* ---- 3. Six Orbiting 3D Spheres (NO visible orbit lines!) ---- */
    const orbMeshes: THREE.Mesh[] = [];
    const orbTextures: THREE.Texture[] = [];
    const orbMaterials: THREE.MeshStandardMaterial[] = [];
    const orbPhaseAngles = PILLARS.map((p) => p.orbit.phase);

    PILLARS.forEach((p, i) => {
      const tex = createPillarOrbTexture(p, () => {});
      orbTextures.push(tex);

      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        bumpMap: tex,
        bumpScale: 0.012,
        roughness: 0.36,
        metalness: 0.1,
        emissive: new THREE.Color("#F5E8D3"),
        emissiveIntensity: 0.04,
      });
      orbMaterials.push(mat);

      const mesh = new THREE.Mesh(new THREE.SphereGeometry(R_ORB, 48, 48), mat);
      mesh.rotation.z = ((i % 2 === 0 ? 1 : -1) * 14 * Math.PI) / 180;
      mesh.userData = { pillarIndex: i, pillarKey: p.key };
      monumentGroup.add(mesh);
      orbMeshes.push(mesh);
    });

    /* ---- Cursor Tracking & Raycasting ---- */
    const pointerTarget = { x: 0, y: 0 };
    const pointerSmooth = { x: 0, y: 0 };
    const pointerNdc = new THREE.Vector2(-99, -99);
    const raycaster = new THREE.Raycaster();
    let pointerInside = false;

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

    const onPointerMove = (e: PointerEvent) => {
      updatePointerFromClient(e.clientX, e.clientY);
    };

    const onPointerLeave = () => {
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
      const picked = pickSphereAt(e.clientX, e.clientY);
      if (picked) openPillar(picked);
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
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

      const damp = 1 - Math.exp(-dt * 5.2);
      pointerSmooth.x += (pointerTarget.x - pointerSmooth.x) * damp;
      pointerSmooth.y += (pointerTarget.y - pointerSmooth.y) * damp;

      // 1. Space Galaxy in continuous motion + following cursor across screen
      galaxyUniforms.uTime.value = elapsed;
      galaxyPlane.rotation.y = elapsed * 0.065;

      starField.position.x = pointerSmooth.x * 1.45;
      starField.position.y = pointerSmooth.y * 1.05;

      galaxyAnchor.position.x = pointerSmooth.x * 3.9;
      galaxyAnchor.position.y = 0.35 + pointerSmooth.y * 2.45;
      galaxyPlane.rotation.x = 0.66 - pointerSmooth.y * 0.25;
      galaxyPlane.rotation.z = -0.26 - pointerSmooth.x * 0.28;

      galaxyUniforms.uCursorWorld.value.set(
        pointerSmooth.x * 8.5,
        pointerSmooth.y * 5.4,
        -16.5
      );

      // 2. Subtle 3D camera & light parallax on the 3D Atlas statue & Celestial Globe
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      const baseZ = getBaseCamZ(w, h);
      camera.position.x = pointerSmooth.x * 0.58;
      camera.position.y = 0.14 + pointerSmooth.y * 0.34;
      camera.position.z = baseZ;
      camera.lookAt(0, 0.1, 0);

      monumentGroup.rotation.y = pointerSmooth.x * 0.095;
      monumentGroup.rotation.x = -pointerSmooth.y * 0.045;

      cursorLight.position.set(
        pointerSmooth.x * 4.4,
        1.5 + pointerSmooth.y * 2.8,
        4.8
      );

      // Rotate the 3D Celestial Globe cradled in Atlas's sculpted hands
      globeMesh.rotation.y = elapsed * 0.17;

      const aspect = w / h;
      const orbitWidthScale = aspect < 0.65 ? 0.7 : aspect < 0.95 ? 0.86 : 1.0;

      // 3. Advance all 6 orbiting 3D spheres along their invisible 3D orbits
      PILLARS.forEach((p, i) => {
        const isHovered = hoveredKeyRef.current === p.key;
        const speedFactor = isHovered ? 0.28 : 1.0;
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
        mesh.rotation.y += dt * (0.85 + i * 0.11);

        const targetScale = isHovered ? 1.24 : 1.0;
        const curScale = mesh.scale.x + (targetScale - mesh.scale.x) * Math.min(1, dt * 12);
        mesh.scale.setScalar(curScale);
        orbMaterials[i].emissiveIntensity = isHovered ? 0.26 : 0.04;
      });

      scene.updateMatrixWorld();

      if (pointerInside) {
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

      // Project floating labels & fade them out cleanly when occluded behind the 3D globe/statue
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
            const outerEdge = R_GLOBE + R_ORB * 0.85;
            const innerEdge = R_GLOBE - R_ORB * 0.35;
            const globeVis = Math.max(
              0,
              Math.min(1, (perpDist - innerEdge) / Math.max(0.01, outerEdge - innerEdge))
            );
            visibility = Math.min(visibility, globeVis);
          }

          if (orbWorldPos.y < globeWorldCenter.y && orbWorldPos.y > STATUE_CENTER_Y - STATUE_H * 0.45) {
            const xDist = Math.abs(orbWorldPos.x - globeWorldCenter.x);
            const torsoVis = Math.max(0, Math.min(1, (xDist - 0.68) / 0.36));
            visibility = Math.min(visibility, torsoVis);
          }
        }

        projVec.copy(orbWorldPos);
        projVec.y -= R_ORB * 1.42 * mesh.scale.y;
        projVec.project(camera);

        const sx = (projVec.x * 0.5 + 0.5) * w;
        const sy = (-projVec.y * 0.5 + 0.5) * h;
        const isHovered = hoveredKeyRef.current === p.key;

        labelEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, 0) scale(${
          isHovered ? 1.08 : 0.92 + visibility * 0.08
        })`;
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
      window.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerleave", onPointerLeave);
      renderer.domElement.removeEventListener("click", onClickCanvas);

      galaxyGeo.dispose();
      fieldGeo.dispose();
      galaxyMat.dispose();
      starFieldMat.dispose();
      nebulaTex.dispose();
      nebulaMats.forEach((m) => m.dispose());
      nebulaSprites.length = 0;
      globeGeo.dispose();
      globeMat.dispose();
      globeTex.dispose();
      statueAlbedoTex?.dispose();
      statueNormalTex?.dispose();
      statueHitMesh?.geometry.dispose();
      orbMeshes.forEach((m) => m.geometry.dispose());
      orbMaterials.forEach((m) => m.dispose());
      orbTextures.forEach((t) => t.dispose());
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [openPillar]);

  return (
    <div className="relative h-[100svh] w-screen overflow-hidden bg-[#08080C] select-none">
      {/* 3D WebGL Canvas (Space Galaxy + 3D Atlas Statue + 3D Globe + 6 3D Orbiting Spheres) */}
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
