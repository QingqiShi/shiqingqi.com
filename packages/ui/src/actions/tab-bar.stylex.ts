import * as stylex from "@stylexjs/stylex";
import { color } from "../color.stylex.ts";
import { font, space } from "../tokens.stylex.ts";

/**
 * The TabBar's dial, set the way `cornerTokens.height` is. `blockSize` is
 * the height of the pill, for a page that keeps its content clear of a bar
 * that floats over it.
 *
 * @internal
 */
export const tabBarTokens = stylex.defineVars({
  blockSize: space._9,
});

/**
 * The tab of a TabBar or of the rail of a TabView that looks selected.
 *
 * @internal
 */
export const tabLink = stylex.create({
  // The colour and the filled icon are the signal in forced colours.
  shown: {
    color: color.primaryText,
    fontWeight: font.weight_6,
  },
});

/**
 * The mark at the top-end corner of a tab's icon: a `badge`, or a `count` in
 * a small pill.
 *
 * @internal
 */
export const tabMark = stylex.create({
  badge: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: `calc(-1 * ${space._0})`,
    display: "flex",
  },
  // Compose it after `typeRole.caption`, `typeModifier.numeric` and
  // `corner.radius_round`.
  count: {
    position: "absolute",
    insetBlockStart: `calc(-1 * ${space._0})`,
    insetInlineStart: "55%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    minInlineSize: "1.125rem",
    blockSize: "1.125rem",
    paddingInline: space._0,
    backgroundColor: color.primary,
    color: color.primaryForeground,
    fontWeight: font.weight_6,
    letterSpacing: 0,
  },
});
