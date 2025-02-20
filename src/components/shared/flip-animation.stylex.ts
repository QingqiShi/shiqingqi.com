import * as stylex from "@stylexjs/stylex";

export const flipAnimationTokens = stylex.defineVars({
  scaleX: stylex.types.number(1),
  scaleY: stylex.types.number(1),
  translateX: stylex.types.length("0px"),
  translateY: stylex.types.length("0px"),
});
