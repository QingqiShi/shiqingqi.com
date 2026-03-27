import * as stylex from "@stylexjs/stylex";
import { space } from "#src/tokens.stylex.ts";

export const gap = stylex.create({
  _none: { gap: 0 },
  _00: { gap: space._00 },
  _0: { gap: space._0 },
  _1: { gap: space._1 },
  _2: { gap: space._2 },
  _3: { gap: space._3 },
  _4: { gap: space._4 },
  _5: { gap: space._5 },
  _6: { gap: space._6 },
  _7: { gap: space._7 },
  _8: { gap: space._8 },
});

export const p = stylex.create({
  _none: { padding: 0 },
  _00: { padding: space._00 },
  _0: { padding: space._0 },
  _1: { padding: space._1 },
  _2: { padding: space._2 },
  _3: { padding: space._3 },
  _4: { padding: space._4 },
  _5: { padding: space._5 },
  _6: { padding: space._6 },
  _7: { padding: space._7 },
  _8: { padding: space._8 },
});

export const pb = stylex.create({
  _none: { paddingBlock: 0 },
  _00: { paddingBlock: space._00 },
  _0: { paddingBlock: space._0 },
  _1: { paddingBlock: space._1 },
  _2: { paddingBlock: space._2 },
  _3: { paddingBlock: space._3 },
  _4: { paddingBlock: space._4 },
  _5: { paddingBlock: space._5 },
  _6: { paddingBlock: space._6 },
  _7: { paddingBlock: space._7 },
  _8: { paddingBlock: space._8 },
});

export const pi = stylex.create({
  _none: { paddingInline: 0 },
  _00: { paddingInline: space._00 },
  _0: { paddingInline: space._0 },
  _1: { paddingInline: space._1 },
  _2: { paddingInline: space._2 },
  _3: { paddingInline: space._3 },
  _4: { paddingInline: space._4 },
  _5: { paddingInline: space._5 },
  _6: { paddingInline: space._6 },
  _7: { paddingInline: space._7 },
  _8: { paddingInline: space._8 },
});

export const m = stylex.create({
  _none: { margin: 0 },
  _00: { margin: space._00 },
  _0: { margin: space._0 },
  _1: { margin: space._1 },
  _2: { margin: space._2 },
  _3: { margin: space._3 },
  _4: { margin: space._4 },
  _5: { margin: space._5 },
  _6: { margin: space._6 },
  _7: { margin: space._7 },
  _8: { margin: space._8 },
});

export const mb = stylex.create({
  _none: { marginBlock: 0 },
  _00: { marginBlock: space._00 },
  _0: { marginBlock: space._0 },
  _1: { marginBlock: space._1 },
  _2: { marginBlock: space._2 },
  _3: { marginBlock: space._3 },
  _4: { marginBlock: space._4 },
  _5: { marginBlock: space._5 },
  _6: { marginBlock: space._6 },
  _7: { marginBlock: space._7 },
  _8: { marginBlock: space._8 },
});

export const mi = stylex.create({
  _none: { marginInline: 0 },
  _00: { marginInline: space._00 },
  _0: { marginInline: space._0 },
  _1: { marginInline: space._1 },
  _2: { marginInline: space._2 },
  _3: { marginInline: space._3 },
  _4: { marginInline: space._4 },
  _5: { marginInline: space._5 },
  _6: { marginInline: space._6 },
  _7: { marginInline: space._7 },
  _8: { marginInline: space._8 },
});
