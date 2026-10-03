/**
 * A Black hole as the shader bends light around it. Lengths are CSS px and
 * positions are page coordinates.
 *
 * Its mass fills its border box, round corners too. Light that passes at a
 * distance `r` from a point mass bends by `mass / r`, away from it as seen,
 * and the lens adds up the bends of all its points. Far away the bend fades
 * faster than that, so that a beam far from every Black hole runs straight.
 *
 * @internal
 */
export interface Lens {
  readonly x: number;
  readonly y: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly cornerRadius: number;
  readonly mass: number;
  /** The square of the distance from the centre at which the bend halves. */
  readonly falloff: number;
}

/**
 * A rectangle in page coordinates.
 *
 * @internal
 */
export interface PageRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * The least gap between an element and its ring: a share of half its
 * shorter side, plus a constant.
 */
const RING_GAP_SCALE = 0.3;
const RING_GAP = 12;
/**
 * Past this many times its own size, a box bends light as a point mass of the
 * same mass does, to within a tenth of a pixel. The shader then uses the
 * point mass, which costs less, and which 32-bit floats keep exact where the
 * box's small sum of large terms would not be.
 *
 * @internal
 */
export const POINT_MASS_DISTANCE = 8;
/** How many ring radii from the centre the bend has halved. */
const FALLOFF_RINGS = 5;
/**
 * The largest multiple of its mass that the `mass` setting gives.
 *
 * @internal
 */
export const MAX_MASS = 4;

/**
 * One corner's share of the bend along the u axis: the double integral of
 * `u / (u² + v²)`. Swap u and v for the bend along the v axis.
 */
function cornerBendX(u: number, v: number) {
  // u atan(v / u) goes to 0 with u, so a tiny u stands in for 0.
  const safeU = Math.abs(u) < 1e-6 ? 1e-6 : u;
  return (
    u * Math.atan(v / safeU) + 0.5 * v * Math.log(Math.max(u * u + v * v, 1e-6))
  );
}

/**
 * How a box of unit density bends light at a page point, as seen from its
 * centre. Each corner adds the double integral of `(u, v) / (u² + v²)` up to
 * it, which is smooth everywhere outside the box.
 */
function boxBend(halfWidth: number, halfHeight: number, x: number, y: number) {
  const left = x + halfWidth;
  const right = x - halfWidth;
  const top = y + halfHeight;
  const bottom = y - halfHeight;
  return {
    x:
      cornerBendX(left, top) -
      cornerBendX(left, bottom) -
      cornerBendX(right, top) +
      cornerBendX(right, bottom),
    y:
      cornerBendX(top, left) -
      cornerBendX(bottom, left) -
      cornerBendX(top, right) +
      cornerBendX(bottom, right),
  };
}

/**
 * Half the size of the box whose bend outside it equals the bend of the
 * lens. A uniform disc bends light outside it as a point mass at its centre
 * does, so a box with round corners of radius r bends light as the box r
 * smaller does, when that box holds the same mass spread over the corners.
 * A circle is then a point mass.
 */
function massHalfSize(lens: {
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly cornerRadius: number;
}) {
  return {
    halfWidth: Math.max(lens.halfWidth - lens.cornerRadius, 0.5),
    halfHeight: Math.max(lens.halfHeight - lens.cornerRadius, 0.5),
  };
}

/**
 * The lens of an element. `massScale` multiplies the mass its size gives: at
 * 1, light from straight behind its centre shows as a ring that clears each
 * side of the element by a gap, and more than that beside the long sides,
 * as a real lens rounds its ring.
 *
 * @internal
 */
export function lensFromBox(
  box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
    readonly radii: readonly number[];
  },
  massScale: number,
): Lens {
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const inner = Math.min(halfWidth, halfHeight);
  const meanRadius =
    box.radii.reduce((sum, radius) => sum + radius, 0) /
    Math.max(1, box.radii.length);
  const scale = Math.min(Math.max(massScale, 0), MAX_MASS);
  const gap = RING_GAP_SCALE * inner + RING_GAP;
  const sideRing = halfHeight + gap;
  const endRing = halfWidth + gap;
  const falloff =
    (FALLOFF_RINGS * Math.max(sideRing, endRing)) ** 2 * Math.max(scale, 0.01);
  const cornerRadius = Math.min(inner, meanRadius);
  const held = massHalfSize({ halfWidth, halfHeight, cornerRadius });
  // The density that bends light at a ring point by its distance from the
  // centre, so that light from the centre shows there, with the fade made up.
  const densityFor = (x: number, y: number) => {
    const ring = Math.hypot(x, y);
    const bend = boxBend(held.halfWidth, held.halfHeight, x, y);
    return (
      (ring * (1 + (ring * ring) / falloff)) /
      Math.max(Math.hypot(bend.x, bend.y), 1e-6)
    );
  };
  const density = Math.max(densityFor(0, sideRing), densityFor(endRing, 0));
  return {
    x: box.x + halfWidth,
    y: box.y + halfHeight,
    halfWidth,
    halfHeight,
    cornerRadius,
    mass: scale * density * 4 * held.halfWidth * held.halfHeight,
    falloff,
  };
}

/**
 * How far light that passes a lens at a page point bends, away from the lens
 * as seen. The shader does the same per pixel.
 *
 * @internal
 */
export function lensBend(lens: Lens, x: number, y: number) {
  const dx = x - lens.x;
  const dy = y - lens.y;
  const squared = dx * dx + dy * dy;
  const fade = 1 / (1 + squared / lens.falloff);
  const held = massHalfSize(lens);
  if (
    squared >
    (POINT_MASS_DISTANCE * Math.max(held.halfWidth, held.halfHeight)) ** 2
  ) {
    const strength = (lens.mass * fade) / squared;
    return { x: dx * strength, y: dy * strength };
  }
  const density = lens.mass / (4 * held.halfWidth * held.halfHeight);
  const bend = boxBend(held.halfWidth, held.halfHeight, dx, dy);
  return { x: bend.x * density * fade, y: bend.y * density * fade };
}

/**
 * Where the light seen at a page point comes from, behind every lens: the
 * point minus the bend of each.
 *
 * @internal
 */
export function sourceOf(lenses: readonly Lens[], x: number, y: number) {
  let sourceX = x;
  let sourceY = y;
  for (const lens of lenses) {
    const bend = lensBend(lens, x, y);
    sourceX -= bend.x;
    sourceY -= bend.y;
  }
  return { x: sourceX, y: sourceY };
}

/**
 * Where the light seen at a page point comes from, as `sourceOf`, but with
 * no bend from a lens whose element covers the point. A lens does not bend
 * light at its own centre.
 *
 * @internal
 */
export function sourceBehind(
  lenses: readonly Lens[],
  point: { readonly x: number; readonly y: number },
) {
  return sourceOf(
    lenses.filter(
      (lens) =>
        Math.abs(point.x - lens.x) > lens.halfWidth ||
        Math.abs(point.y - lens.y) > lens.halfHeight,
    ),
    point.x,
    point.y,
  );
}

/**
 * The angle at which a beam that starts at `origin`, a point behind every
 * lens, is seen to pass through the page point `to`, however the lenses bend
 * it on the way.
 *
 * @internal
 */
export function aimBehindLenses(
  lenses: readonly Lens[],
  origin: { readonly x: number; readonly y: number },
  to: { readonly x: number; readonly y: number },
) {
  const end = sourceBehind(lenses, to);
  return Math.atan2(end.y - origin.y, end.x - origin.x);
}

/**
 * The lens whose centre is nearest a page point, other than one centred on
 * it, or `null`.
 *
 * @internal
 */
export function nearestLens(lenses: readonly Lens[], x: number, y: number) {
  let nearest: Lens | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const lens of lenses) {
    const distance = Math.hypot(lens.x - x, lens.y - y);
    if (distance > 0 && distance < nearestDistance) {
      nearest = lens;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/**
 * The most a lens can bend light anywhere in a rectangle.
 *
 * @internal
 */
export function largestBendIn(lens: Lens, rect: PageRect) {
  const gapX = Math.max(
    0,
    rect.x - (lens.x + lens.halfWidth),
    lens.x - lens.halfWidth - (rect.x + rect.width),
  );
  const gapY = Math.max(
    0,
    rect.y - (lens.y + lens.halfHeight),
    lens.y - lens.halfHeight - (rect.y + rect.height),
  );
  // A mass bends light at r by at most mass / r. Light inside the element
  // does not show, and light at its edge is at least half its shorter side
  // from most of the mass.
  const distance = Math.max(
    Math.hypot(gapX, gapY),
    Math.min(lens.halfWidth, lens.halfHeight),
    1,
  );
  return lens.mass / (distance * (1 + (distance * distance) / lens.falloff));
}
