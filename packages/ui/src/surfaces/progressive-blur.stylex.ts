import * as stylex from "@stylexjs/stylex";

/**
 * The measured size of a reaching blur's box. The layer wrapper stays 0×0,
 * and each layer takes this size.
 *
 * @internal
 */
export const blurBoxTokens = stylex.defineVars({
  inlineSize: "0px",
  blockSize: "0px",
});
