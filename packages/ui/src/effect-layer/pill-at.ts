import { clamp } from "../clamp.ts";
import type { LiquidControl, Pill } from "./liquid-reader.ts";

/**
 * The pill at `index`, a stop index that can be fractional: between two
 * stops, the target and the span go from one to the other.
 *
 * @internal
 */
export function pillAt(stops: readonly Pill[], index: number): Pill {
  const i = clamp(Math.floor(index), 0, Math.max(0, stops.length - 2));
  const from = stops[i];
  const to = stops.at(i + 1) ?? from;
  const t = clamp(index - i, 0, 1);
  return {
    target: from.target + (to.target - from.target) * t,
    span: from.span + (to.span - from.span) * t,
  };
}

/**
 * Which way the liquid pours to `position` from `from`: an end stop always pours to that end.
 *
 * @internal
 */
export function headingTo(position: number, from: number, last: number) {
  if (position <= 0) {
    return -1;
  }
  return position >= last || position >= from ? 1 : -1;
}

/**
 * Where `pointerAt` is across the page against the rest shape of the pill of
 * `target` and `span`, as `EdgeLight.lean` gives it. A vertical track has its
 * pill down the page, so across the page the shape is only as wide as a thumb.
 *
 * @internal
 */
export function leanTowards(
  pointerAt: number,
  { originX, radius, vertical }: LiquidControl,
  target: number,
  span: number,
) {
  const [centre, half] =
    vertical === true
      ? [originX, radius]
      : [originX + target * radius, (span + 1) * radius];
  return clamp((pointerAt - centre) / half, -1, 1);
}
