import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";

export const hooksSpecimen = stylex.create({
  // Wider tracks than the default: a dialog, a popover and a segmented control
  // all need more room than a button does.
  tracks: {
    gridTemplateColumns: {
      default: "1fr",
      [breakpoints.md]: "repeat(auto-fit, minmax(260px, 1fr))",
    },
  },
});
