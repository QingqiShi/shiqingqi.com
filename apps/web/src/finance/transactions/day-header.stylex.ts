import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

/** The box of a `DayHeader` and its rule, which its skeleton also takes. */
export const dayHeader = stylex.create({
  day: {
    paddingBlockStart: space._3,
  },
  rule: {
    paddingBlockEnd: space._1,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.border,
  },
});
