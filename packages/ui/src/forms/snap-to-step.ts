import { clamp } from "../clamp.ts";

/**
 * The range of a Slider: its bounds and the size of each step.
 *
 * @internal
 */
export interface SliderRange {
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/** The decimal places of `value`, so a sum of steps does not show float noise. */
function decimalsOf(value: number) {
  const [, fraction = ""] = String(value).split(".");
  return fraction.length;
}

/**
 * The size of each step of the range, as a native range input takes it.
 *
 * @internal
 */
export const stepOf = ({ step }: SliderRange) => (step > 0 ? step : 1);

/**
 * How many whole steps the range holds.
 *
 * @internal
 */
export function stepCount(range: SliderRange) {
  return Math.max(
    0,
    Math.floor((range.max - range.min) / stepOf(range) + 1e-9),
  );
}

/**
 * `raw` on the nearest step from `min`, inside the range, as a native range
 * input rounds it.
 *
 * @internal
 */
export function snapToStep(raw: number, range: SliderRange) {
  const { min, max } = range;
  if (!(max > min)) {
    return min;
  }
  const size = stepOf(range);
  const steps = Math.round((clamp(raw, min, max) - min) / size);
  const snapped = min + Math.min(steps, stepCount(range)) * size;
  return Number(snapped.toFixed(Math.max(decimalsOf(size), decimalsOf(min))));
}

/**
 * Where `value` lies in the range, from 0 at `min` to 1 at `max`.
 *
 * @internal
 */
export function fractionOf(value: number, { min, max }: SliderRange) {
  return max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
}

/** The strides a row of ticks can take, as steps of the range per tick. */
const NICE = [1, 2, 5];

/**
 * How many steps of the range lie between two ticks of the groove: the
 * smallest stride of 1, 2 or 5 times a power of ten that keeps the ticks at
 * least `minGap` CSS px apart over `travel` px. `null` when the range has
 * fewer than two steps or no stride fits.
 *
 * @internal
 */
export function tickStride(range: SliderRange, travel: number, minGap: number) {
  const steps = stepCount(range);
  if (steps < 2 || !(travel > 0)) {
    return null;
  }
  for (let power = 1; power <= steps; power *= 10) {
    for (const nice of NICE) {
      const stride = nice * power;
      if (stride >= steps) {
        return null;
      }
      if ((travel * stride) / steps >= minGap) {
        return stride;
      }
    }
  }
  return null;
}
