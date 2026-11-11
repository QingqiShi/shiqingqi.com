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
  default: { color: color.foreground },
  muted: { color: color.mutedForeground },
  primary: { color: color.primaryText },
  success: { color: color.successText },
  warning: { color: color.warningText },
  destructive: { color: color.destructiveText },
  info: { color: color.infoText },
});
