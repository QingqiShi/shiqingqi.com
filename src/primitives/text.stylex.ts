import * as stylex from "@stylexjs/stylex";
import { color, font } from "#src/tokens.stylex.ts";

export const text = stylex.create({
  display: { fontSize: font.vpDisplay },
  subDisplay: { fontSize: font.vpSubDisplay },
  heading1: { fontSize: font.vpHeading1 },
  heading2: { fontSize: font.vpHeading2 },
  heading3: { fontSize: font.vpHeading3 },
  uiHeading1: { fontSize: font.uiHeading1 },
  uiHeading2: { fontSize: font.uiHeading2 },
  uiHeading3: { fontSize: font.uiHeading3 },
  body: { fontSize: font.uiBody },
  bodySmall: { fontSize: font.uiBodySmall },
});

export const weight = stylex.create({
  _1: { fontWeight: font.weight_1 },
  _2: { fontWeight: font.weight_2 },
  _3: { fontWeight: font.weight_3 },
  _4: { fontWeight: font.weight_4 },
  _5: { fontWeight: font.weight_5 },
  _6: { fontWeight: font.weight_6 },
  _7: { fontWeight: font.weight_7 },
  _8: { fontWeight: font.weight_8 },
  _9: { fontWeight: font.weight_9 },
});

export const leading = stylex.create({
  _00: { lineHeight: font.lineHeight_00 },
  _0: { lineHeight: font.lineHeight_0 },
  _1: { lineHeight: font.lineHeight_1 },
  _2: { lineHeight: font.lineHeight_2 },
  _3: { lineHeight: font.lineHeight_3 },
  _4: { lineHeight: font.lineHeight_4 },
  _5: { lineHeight: font.lineHeight_5 },
});

export const textColor = stylex.create({
  main: { color: color.textMain },
  muted: { color: color.textMuted },
  onActive: { color: color.textOnActive },
});
