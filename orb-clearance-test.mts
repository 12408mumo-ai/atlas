import assert from "node:assert/strict";
const loaded: any = await import("./lib/orb-clearance.ts");
const { clearanceField } = loaded.default ?? loaded;

// The estimated distance must never overstate the space around a silhouette.
const w = 23, h = 19;
const pixels = new Uint8Array(w * h * 4);
const occupied = [[1, 2], [11, 7], [18, 16]];
for (const [x, y] of occupied) pixels[(y * w + x) * 4 + 3] = 255;
const field = clearanceField(pixels, w, h);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
  const exact = Math.min(...occupied.map(([ox, oy]) => Math.hypot(x - ox, y - oy)));
  assert.ok(field[y * w + x] <= exact + 0.0001);
}
console.log("Orb clearance field stays conservative");
