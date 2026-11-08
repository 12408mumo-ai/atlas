/** A conservative screen-space distance field for the monument's silhouette. */
export function clearanceField(rgba: Uint8Array, width: number, height: number): Float32Array {
  const distances = new Float32Array(width * height);
  for (let i = 0; i < distances.length; i++) distances[i] = rgba[i * 4 + 3] ? 0 : width + height;
  // Eight neighbours with unit weight give Chebyshev distance: a lower bound
  // on true distance, so the protected margin is never underestimated.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = y * width + x;
    if (x) distances[i] = Math.min(distances[i], distances[i - 1] + 1);
    if (y) {
      distances[i] = Math.min(distances[i], distances[i - width] + 1);
      if (x) distances[i] = Math.min(distances[i], distances[i - width - 1] + 1);
      if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i - width + 1] + 1);
    }
  }
  for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) {
    const i = y * width + x;
    if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i + 1] + 1);
    if (y + 1 < height) {
      distances[i] = Math.min(distances[i], distances[i + width] + 1);
      if (x) distances[i] = Math.min(distances[i], distances[i + width - 1] + 1);
      if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i + width + 1] + 1);
    }
  }
  return distances;
}
