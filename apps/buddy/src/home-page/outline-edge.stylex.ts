import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

// An outline Button has the quiet edge of a surface. On a sunken block, or
// after a filled action, its edge is the only sign of the button, so it takes
// the edge of a control.
export const outlineEdge = stylex.create({
  control: {
    borderColor: color.borderStrong,
  },
});
