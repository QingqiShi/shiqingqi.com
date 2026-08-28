import * as stylex from "@stylexjs/stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";

/**
 * Chrome for a "do" / "don't" guideline diagram — the miniature page a
 * component's Guidelines section draws by hand to stage a floating panel
 * over it. Shared by Popover and Progressive blur, whose diagrams both stage
 * that page and only differ in what happens to it behind the panel.
 *
 * `frame` carries no radius: a callsite composes `corner.radius_2` over it, so
 * the corner arrives with its squircle shape rather than as a bare radius. It
 * carries no clip either — a diagram staging a `ProgressiveBlur` needs none,
 * and a squircle-cornered clip above the blur layers makes Chrome drop their
 * masks and flatten the ramp. A diagram whose own content runs corner to corner
 * (the scrim) composes `clip` on top.
 */
export const guidelineDiagram = stylex.create({
  frame: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    inlineSize: "100%",
    minBlockSize: space._10,
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  clip: {
    overflow: "hidden",
  },
  // Thinned for diagram scale: the real scrim is a solid slab at this size,
  // and the panel above it stops reading as raised.
  scrim: {
    position: "absolute",
    inset: 0,
    backgroundColor: `color-mix(in srgb, ${color.bgScrim} 58%, transparent)`,
  },
});
