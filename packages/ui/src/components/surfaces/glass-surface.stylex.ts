import * as stylex from "@stylexjs/stylex";
import { border, color, shadow } from "../../tokens.stylex.ts";

/** Each part's colour, and the depth of the blur. */
export const glassTokens = stylex.defineVars({
  fill: color.glassFill,
  border: color.glassBorder,
  highlight: color.glassHighlight,
  blur: "8px",
});

/**
 * The Glass skin: a translucent fill over a blur, so what lies beneath it
 * stays visible but loses its detail. The blur is the element's own
 * background, which is what keeps Glass apart from a Progressive blur — that
 * one belongs to the page. Glass is the one surface that also floats above
 * what it sits on, like a lens, so it is the one exception to "nothing casts
 * a shadow".
 *
 * `glassTokens` is the per-surface dial, set the way `cornerTokens.height`
 * is: override the var in a local `stylex.create` block.
 *
 * The consumer positions the element — the rim below is an absolute
 * pseudo-element — and pairs it with a `corner.*` preset or its own radius;
 * the rim inherits the radius and corner shape.
 */
// Two shares of the highlight, one for each thing the light does at the
// bottom of the glass: leaves through the rim, or bounces back through the
// body just inside the edge.
const RIM_EXIT_LIGHT = "60%";
const BOUNCED_LIGHT = "64%";

export const glassSurface = stylex.create({
  base: {
    backgroundColor: glassTokens.fill,
    backdropFilter: `blur(${glassTokens.blur})`,
    // Lit from straight above, so nothing tilts. The Button's shadow lifts
    // the glass off what it sits on; a one-pixel band inside the bottom edge
    // is the rim's light bounced back through the glass, which on a light
    // page is lost in the fill. The face itself stays flat: a sheen across it
    // would read as a dome.
    boxShadow: `${shadow._2}, inset 0 -1px 1px color-mix(in srgb, ${glassTokens.highlight} ${BOUNCED_LIGHT}, transparent)`,
    // The rim, masked to a hairline: the border colour all the way round,
    // with the light on top of it — full along the top edge, gone down the
    // sides, back along the bottom where light leaves the glass. Half a pixel
    // is one device pixel on a dense screen, which is what keeps it from
    // reading as a border. A border cannot take a gradient, and a background
    // layer shows through the translucent fill, so it is a pseudo-element.
    "::before": {
      content: '""',
      position: "absolute",
      inset: 0,
      borderRadius: "inherit",
      cornerShape: "inherit",
      padding: `calc(${border.size_1} / 2)`,
      pointerEvents: "none",
      backgroundImage: `linear-gradient(180deg, ${glassTokens.highlight} 0%, transparent 35%, transparent 65%, color-mix(in srgb, ${glassTokens.highlight} ${RIM_EXIT_LIGHT}, transparent) 100%), linear-gradient(${glassTokens.border}, ${glassTokens.border})`,
      // Safari only reads the vendor-prefixed pair; StyleX emits the
      // unprefixed pair on its own, so both ship side by side.
      WebkitMaskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
      WebkitMaskClip: "content-box, border-box",
      WebkitMaskComposite: "xor",
      maskImage: "linear-gradient(#000 0 0), linear-gradient(#000 0 0)",
      maskClip: "content-box, border-box",
      maskComposite: "exclude",
    },
  },
});
