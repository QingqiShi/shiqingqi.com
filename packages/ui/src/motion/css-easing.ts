const KEYWORDS: Readonly<Partial<Record<string, readonly number[]>>> = {
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** How close, as a share of the time, the solver gets to the time of a point. */
const EPSILON = 1e-6;

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const curve = (a: number, b: number) => (t: number) =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  const x = curve(x1, x2);
  const y = curve(y1, y2);
  const slope = (t: number) =>
    3 * x1 * (1 - t) ** 2 + 6 * (x2 - x1) * t * (1 - t) + 3 * (1 - x2) * t * t;
  const timeOf = (share: number) => {
    let t = share;
    for (let step = 0; step < 8; step++) {
      const error = x(t) - share;
      if (Math.abs(error) < EPSILON) return t;
      const d = slope(t);
      if (Math.abs(d) < EPSILON) break;
      t -= error / d;
    }
    let low = 0;
    let high = 1;
    t = share;
    while (high - low > EPSILON) {
      if (x(t) < share) low = t;
      else high = t;
      t = (low + high) / 2;
    }
    return t;
  };
  return (share: number) => {
    if (share <= 0) return 0;
    if (share >= 1) return 1;
    return y(timeOf(share));
  };
}

/**
 * The easing function of a CSS easing token: a keyword such as `ease-out`,
 * or `cubic-bezier(…)`. A tween of the engine takes it, so that it moves as
 * the CSS transition of the same token.
 *
 * @internal
 */
export function cssEasing(token: string): (share: number) => number {
  const text = token.trim();
  if (text === "linear") return (share) => share;
  const points =
    KEYWORDS[text] ??
    /^cubic-bezier\(([^)]*)\)$/.exec(text)?.[1]?.split(",").map(Number);
  if (points?.length !== 4 || points.some((point) => !Number.isFinite(point))) {
    throw new RangeError(`No easing for "${token}".`);
  }
  const [x1, y1, x2, y2] = points;
  return cubicBezier(x1, y1, x2, y2);
}
