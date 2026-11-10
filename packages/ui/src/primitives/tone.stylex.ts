import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";

/**
 * The text colour of each tone: the text colour, muted text, and the
 * foreground of each Intent. `Text` takes it for `tone`, `Stat` for the
 * colour of its figure, and `Callout` for its title and icon.
 *
 * @internal
 */
export const toneColor = stylex.create({
  default: { color: color.fg },
  muted: { color: color.fgMuted },
  accent: { color: color.fgAccent },
  success: { color: color.fgSuccess },
  warning: { color: color.fgWarning },
  danger: { color: color.fgDanger },
  info: { color: color.fgInfo },
});
