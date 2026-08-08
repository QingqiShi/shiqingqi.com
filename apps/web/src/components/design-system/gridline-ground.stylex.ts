import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

/**
 * Gridline-via-gap: the ground the token specimens are laid out on.
 *
 * The element is a solid `bgCanvas` rectangle and every cell inside it is an
 * opaque fill, so the only place the ground shows through is the gaps between
 * cells — and that is what draws the hairline dividers. No cell needs a border,
 * shadow, or radius of its own.
 *
 * This recipe owns the ground, the frame, and the clip. Each consumer owns its
 * own `display`, track template, and gap direction, because those are what
 * differ: a subgrid column gaps rows only, a swatch grid gaps both axes, and
 * the column counts are per-section responsive decisions.
 *
 * The frame is `neutralBorder` so a section still reads as a self-contained unit
 * when it sits on the bare page canvas rather than inside a surface card. It has
 * to be a border rather than padding: `overflow: hidden` shrinks the clip radius
 * by the border's own width, which is what keeps the corner cells concentric
 * with the frame instead of letting the ground bulge past them at the rounded
 * corners. An inset ring (`box-shadow`) draws in the same place but takes no
 * space, so it loses that correction — prefer this recipe over re-deriving it.
 *
 * Translucent cell fills composite over the `bgCanvas` ground, so dividers read
 * softer next to them. A consumer whose cells are carved *into* a panel rather
 * than laid *on* the canvas overrides `backgroundColor` and keeps the rest.
 */
export const gridlineGround = stylex.create({
  base: {
    backgroundColor: color.bgCanvas,
    borderWidth: space._00,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_2,
    cornerShape: "squircle",
    overflow: "hidden",
  },
});
