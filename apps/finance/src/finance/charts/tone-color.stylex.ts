import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

export const toneColor = stylex.create({
  up: { color: color.success },
  down: { color: color.destructive },
  flat: { color: color.primary },
});
