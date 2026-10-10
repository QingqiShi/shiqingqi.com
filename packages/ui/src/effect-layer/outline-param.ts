/**
 * A box with round corners of one radius, such as the stadium of a Switch's
 * track. Lengths are CSS px.
 *
 * @internal
 */
export interface OutlineBox {
  readonly width: number;
  readonly height: number;
  readonly radius: number;
}

/** How much nearer a side must be than the top or bottom to win, in CSS px. */
const TIE = 0.5;

/** The radius the corners can have: at most half the shorter side. */
function cornerRadius({ width, height, radius }: OutlineBox) {
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}

/**
 * The length of the box's outline.
 *
 * @internal
 */
export function outlineLength(box: OutlineBox) {
  const radius = cornerRadius(box);
  return (
    2 * (box.width - 2 * radius) +
    2 * (box.height - 2 * radius) +
    2 * Math.PI * radius
  );
}

/**
 * How far along the outline the point of it nearest to `(x, y)` is, in CSS
 * px from the middle of the top edge, clockwise. The point is in the box's
 * own space, from its top-left corner. `ring-light-wgsl.ts` has the same
 * parametrisation in WGSL.
 *
 * @internal
 */
export function outlineParam(box: OutlineBox, x: number, y: number) {
  const radius = cornerRadius(box);
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  const a = halfWidth - radius;
  const b = halfHeight - radius;
  const localX = x - halfWidth;
  const localY = y - halfHeight;
  const quarter = (Math.PI / 2) * radius;
  // Where each piece of the outline starts: the top edge's right half, the
  // top-right arc, the right edge, the bottom-right arc, the bottom edge,
  // the bottom-left arc, the left edge, the top-left arc, the top edge's
  // left half.
  const starts = {
    arcTopRight: a,
    right: a + quarter,
    arcBottomRight: a + quarter + 2 * b,
    bottom: a + 2 * quarter + 2 * b,
    arcBottomLeft: 3 * a + 2 * quarter + 2 * b,
    left: 3 * a + 3 * quarter + 2 * b,
    arcTopLeft: 3 * a + 3 * quarter + 4 * b,
    topLeft: 3 * a + 4 * quarter + 4 * b,
  };

  const onTop = () => (localX >= 0 ? localX : starts.topLeft + localX + a);
  const onBottom = () => starts.bottom + (a - localX);
  const onRight = () => starts.right + (localY + b);
  const onLeft = () => starts.left + (b - localY);

  if (Math.abs(localX) <= a && Math.abs(localY) <= b) {
    const toTop = localY + halfHeight;
    const toBottom = halfHeight - localY;
    const toLeft = localX + halfWidth;
    const toRight = halfWidth - localX;
    // The centre of a stadium's cap is as near to the cap's tip as to its
    // top, and a Switch's thumb sits there: the tip wins, so that a ring
    // light from the thumb starts at the end of the track.
    if (Math.min(toLeft, toRight) <= Math.min(toTop, toBottom) + TIE) {
      return toLeft <= toRight ? onLeft() : onRight();
    }
    return toTop <= toBottom ? onTop() : onBottom();
  }
  if (Math.abs(localX) <= a) {
    return localY < 0 ? onTop() : onBottom();
  }
  if (Math.abs(localY) <= b) {
    return localX < 0 ? onLeft() : onRight();
  }
  const angle = Math.atan2(
    localY - Math.sign(localY) * b,
    localX - Math.sign(localX) * a,
  );
  if (localX > 0 && localY < 0) {
    return starts.arcTopRight + (angle + Math.PI / 2) * radius;
  }
  if (localX > 0) {
    return starts.arcBottomRight + angle * radius;
  }
  if (localY > 0) {
    return starts.arcBottomLeft + (angle - Math.PI / 2) * radius;
  }
  // The top-left arc runs from -π to -π/2; a point level with its centre
  // measures +π.
  return (
    starts.arcTopLeft +
    ((angle > 0 ? angle - 2 * Math.PI : angle) + Math.PI) * radius
  );
}

/**
 * How far along the outline the point of it farthest from `(x, y)` is,
 * as `outlineParam` measures it: where a flood from that point covers the
 * box last.
 *
 * @internal
 */
export function farthestOutlineParam(box: OutlineBox, x: number, y: number) {
  const { centreX, centreY, reach } = farthest(box, x, y);
  const radius = cornerRadius(box);
  const distance = Math.max(reach - radius, 1e-6);
  return outlineParam(
    box,
    centreX + ((centreX - x) / distance) * radius,
    centreY + ((centreY - y) / distance) * radius,
  );
}

/** The corner arc farthest from a point, by its centre, and how far. */
function farthest(box: OutlineBox, x: number, y: number) {
  const radius = cornerRadius(box);
  let far = { centreX: radius, centreY: radius, reach: 0 };
  for (const centreX of [radius, box.width - radius]) {
    for (const centreY of [radius, box.height - radius]) {
      const reach = Math.hypot(x - centreX, y - centreY) + radius;
      if (reach > far.reach) {
        far = { centreX, centreY, reach };
      }
    }
  }
  return far;
}
