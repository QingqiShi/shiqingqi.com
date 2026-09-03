import * as stylex from "@stylexjs/stylex";
import { color } from "../../tokens.stylex.ts";

export const progressTokens = stylex.defineVars({
  // How much of the track the indicator covers. `Progress` sets it from
  // `value`/`max`.
  indicatorSize: "0%",
  // The indicator's colour. Exposed because the pseudo-element painting it is
  // out of reach of the `css` escape hatch — see `Progress` on retinting.
  indicatorColor: color.accent,
});
