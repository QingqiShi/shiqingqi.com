/**
 * Where the pointer at `x` reads on a plot `width` pixels wide whose first
 * point is at 0 and last at `width`. Where the plot bleeds `bleed` pixels
 * past the page on a side, the span inside the page stretches over the whole
 * plot, so a finger at the page's edge reads the first or last point. With
 * no bleed, `x` reads as it is, kept inside the plot.
 */
export function plotXFromPointer(
  x: number,
  width: number,
  bleed: { left: number; right: number },
) {
  const start = bleed.left;
  const end = width - bleed.right;
  const reach = end > start ? ((x - start) / (end - start)) * width : x;
  return Math.min(Math.max(reach, 0), width);
}
