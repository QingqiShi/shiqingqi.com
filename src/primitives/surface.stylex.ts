import * as stylex from "@stylexjs/stylex";
import { border, color, shadow } from "#src/tokens.stylex.ts";

export const bg = stylex.create({
  main: { backgroundColor: color.backgroundMain },
  raised: { backgroundColor: color.backgroundRaised },
  hover: { backgroundColor: color.backgroundHover },
  translucent: { backgroundColor: color.backgroundTranslucent },
  transparent: { backgroundColor: "transparent" },
});

export const rounded = stylex.create({
  none: { borderRadius: 0 },
  _1: { borderRadius: border.radius_1 },
  _2: { borderRadius: border.radius_2 },
  _3: { borderRadius: border.radius_3 },
  _4: { borderRadius: border.radius_4 },
  _5: { borderRadius: border.radius_5 },
  round: { borderRadius: border.radius_round },
});

export const elevation = stylex.create({
  none: { boxShadow: "none" },
  _1: { boxShadow: shadow._1 },
  _2: { boxShadow: shadow._2 },
  _3: { boxShadow: shadow._3 },
  _4: { boxShadow: shadow._4 },
  _5: { boxShadow: shadow._5 },
  _6: { boxShadow: shadow._6 },
});
