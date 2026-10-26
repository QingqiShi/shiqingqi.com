import * as stylex from "@stylexjs/stylex";
import { font, space } from "@tuja/ui/tokens.stylex";

const paddingBlock = space._1;
const titleLine = `calc(${font.uiBody} * ${font.lineHeight_4})`;
const secondLine = `calc(${font.uiBodySmall} * ${font.lineHeight_4})`;

/** The sizes of a `TransactionFace`, which its skeleton also takes. */
export const transactionFaceTokens = stylex.defineVars({
  paddingBlock,
  icon: "2.25rem",
  secondLine,
  /** A face of a title line and one second line, padding included. */
  twoLines: `calc(${paddingBlock} * 2 + ${titleLine} + ${secondLine})`,
});
