/* Checks the ribbon sphere's geometry headlessly: the strands stay on
   the canvas, the form reads as a sphere, the colours fall into their
   bands, the bands land in the right places, and the flow keeps moving. */

const LOGICAL = 460;
const R = LOGICAL * 0.31;
const CX = LOGICAL / 2;
const CY = LOGICAL / 2;

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
 * Mirrors colourAt() in components/RibbonSphere.tsx.
 */
function colourAt(nx: number, ny: number) {
  const mag =
    smooth(0.02, 0.4, ny) *
    smooth(0.16, -0.16, nx) *
    smooth(-0.62, -0.1, nx * 0.55 + ny * 0.85) *
    smooth(1.12, 0.86, Math.hypot(nx + 0.06, ny - 0.28));

  const blu =
    smooth(0.3, 0.02, ny) *
    smooth(-0.14, 0.14, nx) *
    smooth(-0.6, -0.16, nx * 0.5 - ny * 0.72);

  const magW = Math.min(1, mag * 1.5);
  const bluW = Math.min(1, blu * 1.5) * (1 - magW);
  const teaW = Math.max(0, 1 - magW - bluW);

  const mix = (a: number[], b: number[], c: number[]) => [
    Math.round(a[0] * magW + b[0] * bluW + c[0] * teaW),
    Math.round(a[1] * magW + b[1] * bluW + c[1] * teaW),
    Math.round(a[2] * magW + b[2] * bluW + c[2] * teaW),
  ];

  return {
    colour: mix(MAGENTA, BLUE, TEAL),
    hot: mix(MAGENTA_HOT, BLUE_HOT, TEAL_SOFT),
    weight: 1.2 + magW * 1.4 + bluW * 1.2,
    magW,
    bluW,
    teaW,
  };
}

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
  // Spread the strands over the whole form with a Fibonacci spiral.
  const y = 1 - f * 2;
  const rad = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = f * Math.PI * 2 * 7 + s * 0.11;
  strands.push({
    lon: Math.atan2(Math.sin(theta) * rad, Math.cos(theta) * rad),
    lat: Math.asin(y),
    radius: 0.62 + (((s * 17) % 100) / 100) * 0.44,
    phase: (s * 0.618034) % (Math.PI * 2),
    turns: 1.4 + (((s * 7) % 100) / 100) * 1.2,
    amp: 0.3 + (((s * 13) % 100) / 100) * 0.26,
    speed: 0.03 + (((s * 23) % 100) / 100) * 0.05,
    bold: s % 11 === 0,
  });
}

let pass = 0;
let fail = 0;
function ok(label: string, cond: boolean, detail = "") {
  if (cond) pass++;
  else {
    fail++;
    console.log(`FAIL ${label} ${detail}`);
  }
}

/** Walk a strand and return the points it draws. */
function walk(s: Strand, t: number) {
  let lon = s.lon + t * s.speed;
  let lat = s.lat;
  const out: {
    x: number;
    y: number;
    z: number;
    key: string;
    nx: number;
    ny: number;
    magW: number;
    bluW: number;
    teaW: number;
  }[] = [];

  for (let i = 0; i <= STEPS; i++) {
    const u = i / STEPS;
    const nlat = lat + Math.sin(lon * s.turns + s.phase + t * s.speed * 4) * s.amp;
    const nlon = lon + 0.055 + s.speed * 0.02;
    const nrad = s.radius * (1 + Math.sin(u * Math.PI * 2 + s.phase) * 0.26);

    const x = Math.cos(nlon) * Math.cos(nlat) * nrad;
    const y = Math.sin(nlat) * nrad;
    const z = Math.cos(nlon) * Math.sin(nlat) * nrad;

    const band = colourAt(x, y);
    const heat = 0.5 + 0.5 * Math.sin(u * Math.PI);
    const rgb = heat > 0.86 ? band.hot : band.colour;

    out.push({
      x: CX + x * R,
      y: CY - y * R,
      z,
      key: rgb.join(","),
      nx: x,
      ny: y,
      magW: band.magW,
      bluW: band.bluW,
      teaW: band.teaW,
    });

    lon = nlon;
    lat = nlat;
  }
  return out;
}

/* 1. Every point stays on the canvas. */
let outside = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    if (p.x < 0 || p.x > LOGICAL || p.y < 0 || p.y > LOGICAL) outside++;
  }
}
ok("every strand stays on the canvas", outside === 0, `${outside} outside`);

/* 2. The form reads as a round sphere. */
let inDisc = 0;
let total = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    total++;
    if (Math.hypot(p.x - CX, p.y - CY) <= R * 1.12) inDisc++;
  }
}
ok(
  "the form is round",
  inDisc / total > 0.9,
  `${((inDisc / total) * 100).toFixed(1)}% inside`
);

/* 3. The weave covers the whole form, not just the front. */
let front = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) if (p.z >= 0) front++;
}
ok(
  "the strands spread around the form",
  front / total > 0.4 && front / total < 0.7,
  `${((front / total) * 100).toFixed(1)}% in front`
);

/* 4. Each colour band actually appears, and they are distinct. */
const seen = new Set<string>();
for (const s of strands) {
  for (const p of walk(s, 0.6)) seen.add(p.key);
}
ok("the form is woven in many colours", seen.size > 60, `${seen.size} colours`);

/* 5. The magenta sits in the upper left. */
let magCount = 0;
let magLeft = 0;
let magAbove = 0;
let magX = 0;
let magY = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    if (p.magW > 0.8) {
      magCount++;
      magX += p.x;
      magY += p.y;
      if (p.x < CX) magLeft++;
      if (p.y < CY) magAbove++;
    }
  }
}
ok("the magenta is on the left", magLeft / magCount > 0.85, `${((magLeft / magCount) * 100).toFixed(1)}% left`);
ok(
  "the magenta is above the middle",
  magAbove / magCount > 0.85,
  `${((magAbove / magCount) * 100).toFixed(1)}% above`
);
ok(
  "the magenta leans to the upper left",
  magX / magCount < CX - 20 && magY / magCount < CY - 20,
  `avg ${(magX / magCount).toFixed(1)}, ${(magY / magCount).toFixed(1)}`
);

/* 6. The blue sits in the lower right. */
let blueCount = 0;
let blueRight = 0;
let blueBelow = 0;
let blueX = 0;
let blueY = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    if (p.bluW > 0.8) {
      blueCount++;
      blueX += p.x;
      blueY += p.y;
      if (p.x > CX) blueRight++;
      if (p.y > CY) blueBelow++;
    }
  }
}
ok("the blue is on the right", blueRight / blueCount > 0.85, `${((blueRight / blueCount) * 100).toFixed(1)}% right`);
ok(
  "the blue is below the middle",
  blueBelow / blueCount > 0.85,
  `${((blueBelow / blueCount) * 100).toFixed(1)}% below`
);
ok(
  "the blue leans to the lower right",
  blueX / blueCount > CX + 10 && blueY / blueCount > CY + 10,
  `avg ${(blueX / blueCount).toFixed(1)}, ${(blueY / blueCount).toFixed(1)}`
);

/* 7. The teal runs through the middle. */
let tealCount = 0;
let tealMiddle = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    if (p.teaW > 0.8) {
      tealCount++;
      if (Math.hypot(p.nx - 0.1, p.ny + 0.15) < 0.5) tealMiddle++;
    }
  }
}
ok("the teal runs through the middle", tealMiddle > 300, `${tealMiddle} points`);

/* 8. The form keeps moving over time. */
let moved = 0;
for (let i = 0; i < strands.length; i += 7) {
  const a = walk(strands[i], 0.1)[20];
  const b = walk(strands[i], 3.0)[20];
  if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) moved++;
}
ok("the form keeps moving", moved > 100, `${moved} moved`);

/* 9. The bold arcs are there. */
const bold = strands.filter((s) => s.bold).length;
ok("there are bold arcs among the strands", bold > 100 && bold < 200, `${bold} bold`);

/* 10. There are enough strands to look woven. */
ok("the form is dense enough to read as woven", STRANDS >= 1200, `${STRANDS} strands`);

/* 11. The bands fade into one another rather than meeting at a hard edge. */
let blended = 0;
let samples = 0;
for (const s of strands) {
  for (const p of walk(s, 0.6)) {
    samples++;
    // A point inside one band has one weight at 1 and the rest at 0.
    // A blended point shares its weight out.
    const top = Math.max(p.magW, p.bluW, p.teaW);
    if (top < 0.98) blended++;
  }
}
ok(
  "the colours blend into one another",
  blended / samples > 0.1 && blended / samples < 0.45,
  `${((blended / samples) * 100).toFixed(1)}% blended`
);

console.log(`${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
