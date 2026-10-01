import * as stylex from "@stylexjs/stylex";
import { font } from "@tuja/ui/tokens.stylex";

export const labEyebrow = stylex.create({
  /** The small uppercase label over a block of the Lab's controls. */
  base: {
    textTransform: "uppercase",
    letterSpacing: font.trackingWider,
    fontWeight: font.weight_6,
  },
});
