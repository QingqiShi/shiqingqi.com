import * as stylex from "@stylexjs/stylex";
import { space } from "@tuja/ui/tokens.stylex";

/** The box of a `DayHeader`, which its skeleton also takes. */
export const dayHeader = stylex.create({
  day: {
    paddingBlockStart: space._3,
  },
});
