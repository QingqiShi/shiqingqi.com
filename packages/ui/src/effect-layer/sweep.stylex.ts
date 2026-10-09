import * as stylex from "@stylexjs/stylex";

/**
 * The timing of the Sweep flood, which CSS runs on the element. The ring
 * light on the effect layer keeps the same duration as `FLOOD_SECONDS` in
 * `sweep-at.ts`, which a test checks. The easing is `1 - (1 - t)³` sampled
 * every twelfth, the curve `floodRadius` uses.
 *
 * @internal
 */
export const sweepConsts = stylex.defineConsts({
  floodDuration: "320ms",
  floodEasing:
    "linear(0, 0.23, 0.421, 0.578, 0.704, 0.802, 0.875, 0.928, 0.963, 0.984, 0.995, 0.999, 1)",
});
