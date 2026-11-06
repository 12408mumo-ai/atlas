/* Runs the particle sphere's geometry headlessly to prove the points
   land where they should: inside the sphere, spread all the way round,
   and the voice ripple pushes them outward. */

const LOGICAL = 380;
const COUNT = 260;

/* --- the same seeding the component uses --- */
const golden = Math.PI * (3 - Math.sqrt(5));
const particles: any[] = [];
for (let i = 0; i < COUNT; i++) {
  const y = 1 - (i / (COUNT - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
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

/* --- replicate the projection used by the canvas --- */
const tiltX = 0.2;
const tiltZ = -0.26;
const cx = LOGICAL / 2;
const cy = LOGICAL / 2;
const R = LOGICAL * 0.34;

function project(p: any, t: number, energy: number) {
  const ang = p.drift * t * 3.4;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  let x = p.x * cs - p.z * sn;
  let z = p.x * sn + p.z * cs;
  const wave = Math.sin(t * 0.7 + p.phase);
  let y = p.y + wave * 0.035;

  if (energy > 0.01) {
    const ring = (t * 0.55) % 1;
    const radial = Math.sqrt(x * x + y * y + z * z) || 1;
    const dist = radial;
    const band = Math.abs(dist - (0.35 + ring * 0.85));
    const push = Math.exp(-((band / 0.16) ** 2)) * energy * 0.22;
    const nx = x / radial;
    const ny = y / radial;
    const nz = z / radial;
    x += nx * push;
    y += ny * push;
    z += nz * push;
  }

  const cxr = Math.cos(tiltX);
  const sxr = Math.sin(tiltX);
  const y2 = y * cxr - z * sxr;
  const z2 = y * sxr + z * cxr;
  const czt = Math.cos(tiltZ);
  const szt = Math.sin(tiltZ);
  const x2 = x * czt - y2 * szt;
  const y3 = x * szt + y2 * czt;

  return { px: cx + x2 * R, py: cy - y3 * R, z: z2 };
}

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else { fail++; console.log(`FAIL ${label} ${detail}`); }
}

/* 1. Every particle draws inside the canvas. */
let outside = 0;
for (const p of particles) {
  const q = project(p, 0, 0);
  if (q.px < 0 || q.px > LOGICAL || q.py < 0 || q.py > LOGICAL) outside++;
}
ok("all particles inside the canvas", outside === 0, `${outside} outside`);

/* 2. The particles spread across the whole sphere, not a tight knot. */
const pts = particles.map((p) => project(p, 0, 0));
const xs = pts.map((q) => q.px);
const ys = pts.map((q) => q.py);
const spanX = Math.max(...xs) - Math.min(...xs);
const spanY = Math.max(...ys) - Math.min(...ys);
ok("particles spread horizontally", spanX > R * 1.2, `spanX ${spanX.toFixed(1)}`);
ok("particles spread vertically", spanY > R * 1.2, `spanY ${spanY.toFixed(1)}`);

/* 3. Some particles are in front and some behind. */
const front = pts.filter((q) => q.z >= 0).length;
ok("particles split front and back", front > COUNT * 0.3 && front < COUNT * 0.7,
  `${front}/${COUNT} front`);

/* 4. The voice ripple pushes particles outward. */
function meanRadius(t: number, energy: number) {
  let sum = 0;
  for (const p of particles) {
    const q = project(p, t, energy);
    sum += Math.hypot(q.px - cx, q.py - cy);
  }
  return sum / particles.length;
}
const calm = meanRadius(0.5, 0);
const loud = meanRadius(0.5, 1);
ok("the ripple pushes particles outward", loud > calm,
  `calm ${calm.toFixed(2)} loud ${loud.toFixed(2)}`);

/* 5. Nothing escapes the canvas even at full energy. */
let escaped = 0;
for (const p of particles) {
  const q = project(p, 0.5, 1);
  if (q.px < -10 || q.px > LOGICAL + 10 || q.py < -10 || q.py > LOGICAL + 10) escaped++;
}
ok("nothing escapes at full energy", escaped === 0, `${escaped} escaped`);

/* 6. The particles keep moving over time. */
const early = particles.map((p) => project(p, 0.1, 0).px);
const later = particles.map((p) => project(p, 3.0, 0).px);
const moved = early.filter((x, i) => Math.abs(x - later[i]) > 1).length;
ok("the swarm keeps moving", moved > COUNT * 0.5, `${moved}/${COUNT} moved`);

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
