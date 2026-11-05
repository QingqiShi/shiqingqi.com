import * as stylex from "@stylexjs/stylex";
import { pointer } from "../breakpoints.stylex.ts";
import { color } from "../color.stylex.ts";
import { cornerTokens } from "../primitives/corner.stylex.ts";
import {
  border,
  controlHeight,
  controlSize,
  font,
  opacity,
} from "../tokens.stylex.ts";

/**
 * The outline look of `Button`, as composable StyleX for an element that a
 * `Button` cannot be, such as a `<select>` or a date `<input>`. `Button` reads
 * `skin` and `active` from here, so the element and an outline `Button` beside
 * it stay the same.
 *
 * Compose a type role first (`typeRole.label` for the `sm` step,
 * `typeRole.caption` for `xs`), then `layout`, `skin`, an `outlineSurfaceSize`
 * step and `corner.squircle_round`, then `interactive`, then `active` for the
 * selected one.
 *
 * `interactive` inlines its focus ring and its touch target instead of
 * composing `a11y.focusRing` and `a11y.touchTarget`, since a primitive can't
 * compose another at definition time. Keep the copies the same as the
 * originals.
 */
export const outlineSurface = stylex.create({
  layout: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    gap: controlSize._1,
    boxSizing: "border-box",
    whiteSpace: "nowrap",
    color: color.fg,
    fontWeight: font.weight_5,
    textDecoration: "none",
  },
  skin: {
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: {
      default: "transparent",
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgControlHover,
        ":disabled:hover": "transparent",
      },
    },
  },
  interactive: {
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: null, ":disabled": opacity.disabled },
    outlineWidth: border.size_2,
    outlineStyle: "solid",
    outlineColor: {
      default: "transparent",
      ":focus-visible": color.borderAccent,
    },
    outlineOffset: border.size_2,
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    position: { default: null, [pointer.coarse]: "relative" },
    isolation: { default: null, [pointer.coarse]: "isolate" },
    "::after": {
      content: { default: null, [pointer.coarse]: '""' },
      position: "absolute",
      inset: "min(0px, calc(50% - 22px))",
      zIndex: -1,
    },
  },
  active: {
    borderColor: color.borderAccent,
    backgroundColor: {
      default: color.bgAccent,
      [pointer.canHover]: {
        default: null,
        ":hover": color.bgAccentHover,
        ":disabled:hover": color.bgAccent,
      },
    },
    color: color.fgOnAccent,
  },
});

/**
 * The height steps of `outlineSurface`. The heights and the padding are those
 * of a `Button` of the same size, so the element lines up with it in a row.
 */
export const outlineSurfaceSize = stylex.create({
  xs: {
    [cornerTokens.height]: controlHeight.xs,
    minBlockSize: controlHeight.xs,
    paddingBlock: controlSize._0,
    paddingInline: controlSize._2,
  },
  sm: {
    [cornerTokens.height]: controlHeight.sm,
    minBlockSize: controlHeight.sm,
    paddingBlock: controlSize._0,
    paddingInline: controlSize._2,
  },
});
