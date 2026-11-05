import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";

export const primitivesSpecimen = stylex.create({
  // Wider tracks than the default: a toolbar, a scroller and a pair of image
  // frames all need more room than a button does.
  tracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(240px, 1fr))",
    },
  },
});
