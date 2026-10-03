// SVG has no `corner-shape`, so a squircle is drawn as a path. Both cubic
// handles of a corner sit at this share of the radius from the box corner,
// which puts the curve's midpoint on the n=4 superellipse — the same squircle
// the `corner` primitive draws.
const SQUIRCLE_HANDLE = 0.0909;

/** The SVG path of a box with squircle corners. */
export function squirclePath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const right = x + width;
  const bottom = y + height;
  const handle = radius * SQUIRCLE_HANDLE;
  // Segments are joined rather than interpolated, so the numbers stay numbers.
  return [
    "M",
    x + radius,
    y,
    "H",
    right - radius,
    "C",
    right - handle,
    y,
    right,
    y + handle,
    right,
    y + radius,
    "V",
    bottom - radius,
    "C",
    right,
    bottom - handle,
    right - handle,
    bottom,
    right - radius,
    bottom,
    "H",
    x + radius,
    "C",
    x + handle,
    bottom,
    x,
    bottom - handle,
    x,
    bottom - radius,
    "V",
    y + radius,
    "C",
    x,
    y + handle,
    x + handle,
    y,
    x + radius,
    y,
    "Z",
  ].join(" ");
}
