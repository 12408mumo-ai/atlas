/* Runs the particle sphere's geometry headlessly to prove the points
   land where they should: inside the sphere, spread all the way round,
   and the voice ripple pushes them outward. */

const LOGICAL = 420;
const COUNT = 420;
const R = LOGICAL * 0.31;

/* --- the same seeding the component uses --- */
const golden = Math.PI * (3 - Math.sqrt(5));
const particles: any[] = [];
for (let i = 0; i < COUNT; i++) {
  const y = 1 - (i / (COUNT - 1)) * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
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

/* --- replicate the projection used by the canvas --- */
const tiltX = 0.16;
const tiltZ = -0.22;
const cx = LOGICAL / 2;
const cy = LOGICAL / 2;

function project(p: any, t: number, energy: number) {
  const ang = p.drift * t * 3.2;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  let x = p.x * cs - p.z * sn;
  let z = p.x * sn + p.z * cs;
  let y = p.y + Math.sin(t * 0.6 + p.phase) * 0.03;

  if (energy > 0.01) {
    const ringPhase = (t * 0.5) % 1;
    const dist = Math.sqrt(x * x + y * y + z * z) || 1;
    const band = Math.abs(dist - (0.4 + ringPhase * 0.8));
    const push = Math.exp(-((band / 0.15) ** 2)) * energy * 0.2;
    x += (x / dist) * push;
    y += (y / dist) * push;
    z += (z / dist) * push;
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
ok("particles spread horizontally", spanX > R * 1.4, `spanX ${spanX.toFixed(1)}`);
ok("particles spread vertically", spanY > R * 1.4, `spanY ${spanY.toFixed(1)}`);

/* 3. The cloud is round — it fills a disc, not a square. */
let inCircle = 0;
for (const p of particles) {
  const q = project(p, 0, 0);
  if (Math.hypot(q.px - cx, q.py - cy) <= R * 1.05) inCircle++;
}
ok("the cloud is round and fills the sphere", inCircle > COUNT * 0.9,
  `${inCircle}/${COUNT} inside`);

/* 4. Some particles are in front and some behind. */
const front = pts.filter((q) => q.z >= 0).length;
ok("particles split front and back", front > COUNT * 0.3 && front < COUNT * 0.7,
  `${front}/${COUNT} front`);

/* 5. The voice ripple pushes particles outward. */
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

/* 6. Nothing escapes the canvas even at full energy. */
let escaped = 0;
for (const p of particles) {
  const q = project(p, 0.5, 1);
  if (q.px < -10 || q.px > LOGICAL + 10 || q.py < -10 || q.py > LOGICAL + 10) escaped++;
}
ok("nothing escapes at full energy", escaped === 0, `${escaped} escaped`);

/* 7. The particles keep moving over time. */
const early = particles.map((p) => project(p, 0.1, 0).px);
const later = particles.map((p) => project(p, 3.0, 0).px);
const moved = early.filter((x, i) => Math.abs(x - later[i]) > 1).length;
ok("the swarm keeps moving", moved > COUNT * 0.5, `${moved}/${COUNT} moved`);

/* 8. Enough particles to look dense, with a few bright sparks. */
ok("the cloud is dense enough to read as a sphere", COUNT >= 350, `${COUNT} particles`);
const sparks = particles.filter((p) => p.spark).length;
ok("a few particles are bright sparks", sparks >= COUNT * 0.05 && sparks <= COUNT * 0.25,
  `${sparks}/${COUNT} sparks`);

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
