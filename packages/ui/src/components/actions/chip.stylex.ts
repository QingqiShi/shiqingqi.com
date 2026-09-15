import * as stylex from "@stylexjs/stylex";
import {
  border,
  color,
  controlSize,
  font,
  opacity,
  space,
} from "../../tokens.stylex.ts";

/**
 * The pill skin shared by every chip and, at rest, by `Badge` — exposed as
 * composable StyleX for an element `Chip` can't be, most often a `<Link>`.
 * Compose `base` plus a `chipSize` step, then `interactive`, then `active`
 * for the selected one.
 *
 * `interactive` inlines its focus ring instead of composing `a11y.focusRing`,
 * since a primitive can't compose another at definition time.
 */
export const chipSurface = stylex.create({
  base: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    gap: space._0,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    borderRadius: border.radius_round,
    cornerShape: "round",
    backgroundColor: color.bgSurface,
    color: color.fg,
    fontWeight: font.weight_5,
    lineHeight: font.lineHeight_2,
    textDecoration: "none",
  },
  interactive: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    borderColor: {
      default: color.border,
      ":hover": color.borderAccent,
      ":disabled:hover": color.border,
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": color.bgControlHover,
      ":disabled:hover": color.bgSurface,
    },
    opacity: { default: null, ":disabled": opacity.disabled },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: border.size_2,
  },
  active: {
    borderColor: color.borderAccent,
    backgroundColor: { default: color.bgAccent, ":hover": color.bgAccentHover },
    color: { default: color.fgOnAccent, ":hover": color.fgOnAccent },
  },
});

/**
 * Height and type steps for a chip, split from `chipSurface` so a
 * hand-composed chip sizes itself the same way the `size` prop does. Heights
 * use `controlSize`, so every step grows on touch viewports.
 */
export const chipSize = stylex.create({
  sm: {
    minBlockSize: controlSize._6,
    paddingBlock: controlSize._0,
    paddingInline: controlSize._2,
    fontSize: font.uiCaption,
  },
  md: {
    minBlockSize: controlSize._8,
    paddingBlock: controlSize._1,
    paddingInline: controlSize._3,
    fontSize: font.uiBodySmall,
  },
});
