import * as stylex from "@stylexjs/stylex";
import { space } from "../tokens.stylex.ts";

/**
 * Each block spaces itself off the one before it, instead of a gap from the
 * parent, so the rhythm holds even when a bare element composes `cardSurface`
 * outside `Card`.
 *
 * The margin is block-axis only, so a caller building a row must add its own
 * `gap`.
 * @internal
 */
export const slotStyles = stylex.create({
  block: {
    marginBlockStart: { default: null, ":not(:first-child)": space._3 },
  },
});
