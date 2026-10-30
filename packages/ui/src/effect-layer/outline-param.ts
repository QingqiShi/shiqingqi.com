// The ring light runs round this outline on the CPU and on the GPU, so both
// use these functions. Lengths are CSS px.

/**
 * The radius the corners of a box of `width` by `height` can have: at most
 * half the shorter side.
 *
 * @internal
 */
export const cornerRadius = (width: number, height: number, radius: number) => {
  "use gpu";
  return Math.max(0, Math.min(radius, Math.min(width, height) * 0.5));
};

/**
 * The length of the outline of a box of `width` by `height` with corners
 * of `radius`, as `cornerRadius` gives it.
 *
 * @internal
 */
export const outlineLength = (
  width: number,
  height: number,
  radius: number,
) => {
  "use gpu";
  return (
    2 * (width - 2 * radius) + 2 * (height - 2 * radius) + 2 * Math.PI * radius
  );
};

/**
 * How far along the outline the point of it nearest to `(x, y)` is, from the
 * middle of the top edge, clockwise, on the outline of `outlineLength`. The
 * point is in the box's own space, from its top-left corner.
 *
 * @internal
 */
export const outlineParam = (
  width: number,
  height: number,
  radius: number,
  x: number,
  y: number,
) => {
  "use gpu";
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const a = halfWidth - radius;
  const b = halfHeight - radius;
  const localX = x - halfWidth;
  const localY = y - halfHeight;
  const quarter = Math.PI * 0.5 * radius;
  const startRight = a + quarter;
  const startBottom = a + 2 * quarter + 2 * b;
  const startLeft = 3 * a + 3 * quarter + 2 * b;
  const startTopLeft = 3 * a + 4 * quarter + 4 * b;

  let onTop = startTopLeft + localX + a;
  if (localX >= 0) {
    onTop = localX;
  }
  const onBottom = startBottom + (a - localX);
  const onRight = startRight + (localY + b);
  const onLeft = startLeft + (b - localY);

  if (Math.abs(localX) <= a && Math.abs(localY) <= b) {
    const toTop = localY + halfHeight;
    const toBottom = halfHeight - localY;
    const toLeft = localX + halfWidth;
    const toRight = halfWidth - localX;
    const nearest = Math.min(
      Math.min(toTop, toBottom),
      Math.min(toLeft, toRight),
    );
    if (nearest === toTop) {
      return onTop;
    }
    if (nearest === toBottom) {
      return onBottom;
    }
    if (nearest === toLeft) {
      return onLeft;
    }
    return onRight;
  }
  if (Math.abs(localX) <= a) {
    if (localY < 0) {
      return onTop;
    }
    return onBottom;
  }
  if (Math.abs(localY) <= b) {
    if (localX < 0) {
      return onLeft;
    }
    return onRight;
  }
  let angle = Math.atan2(
    localY - Math.sign(localY) * b,
    localX - Math.sign(localX) * a,
  );
  if (localX > 0 && localY < 0) {
    return a + (angle + Math.PI * 0.5) * radius;
  }
  if (localX > 0) {
    return a + quarter + 2 * b + angle * radius;
  }
  if (localY > 0) {
    return 3 * a + 2 * quarter + 2 * b + (angle - Math.PI * 0.5) * radius;
  }
  // The top-left arc runs from -π to -π/2. A point level with its centre
  // measures +π.
  if (angle > 0) {
    angle -= 2 * Math.PI;
  }
  return 3 * a + 3 * quarter + 4 * b + (angle + Math.PI) * radius;
};
