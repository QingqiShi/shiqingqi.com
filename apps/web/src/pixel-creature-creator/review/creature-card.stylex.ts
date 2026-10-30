import * as stylex from "@stylexjs/stylex";
import { color } from "@tuja/ui/tokens.stylex";

/** The creature type's colour, which tints the card's header, screen and stat bars. */
export const creatureCardVars = stylex.defineVars({
  accent: color.bgNeutral,
});
