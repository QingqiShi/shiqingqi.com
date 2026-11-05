import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/color.stylex";

export const toneColor = stylex.create({
  up: { color: color.bgSuccess },
  down: { color: color.bgDanger },
  flat: { color: color.bgAccent },
});
