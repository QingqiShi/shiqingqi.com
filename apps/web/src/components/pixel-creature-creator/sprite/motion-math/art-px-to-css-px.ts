/** Convert art-pixel units to CSS pixels at the given scale. */
export function artPxToCssPx(artPx: number, scale: number): number {
  return artPx * scale;
}
