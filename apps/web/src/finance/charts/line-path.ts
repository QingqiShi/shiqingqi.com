function round(value: number) {
  return Math.round(value * 10) / 10;
}

/** An SVG path through the points, in pixels. */
export function linePath(xs: Float64Array, ys: Float64Array): string {
  if (xs.length === 0) return "";
  const parts = new Array<string>(xs.length);
  for (let index = 0; index < xs.length; index++) {
    parts[index] =
      `${index === 0 ? "M" : "L"}${String(round(xs[index]))} ${String(round(ys[index]))}`;
  }
  return parts.join("");
}

/** The line path closed down (or up) to `baseline`, for an area fill. */
export function areaPath(
  xs: Float64Array,
  ys: Float64Array,
  baseline: number,
): string {
  if (xs.length === 0) return "";
  const first = String(round(xs[0]));
  const last = String(round(xs[xs.length - 1]));
  const base = String(round(baseline));
  return `${linePath(xs, ys)}L${last} ${base}L${first} ${base}Z`;
}
