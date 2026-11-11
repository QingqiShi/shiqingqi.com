import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";

/**
 * The colour of text, by tone: the text colour, muted text, and the text
 * colour of each Intent. The names are the values of `tone` on `Text`.
 *
 * @internal
 */
export const textTone = stylex.create({
  default: { color: color.foreground },
  muted: { color: color.mutedForeground },
  primary: { color: color.primaryText },
  success: { color: color.successText },
  warning: { color: color.warningText },
  destructive: { color: color.destructiveText },
  info: { color: color.infoText },
});
