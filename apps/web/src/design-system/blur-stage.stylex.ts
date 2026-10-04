import * as stylex from "@stylexjs/stylex";

/**
 * The box around a specimen whose Progressive blur sits in a fixed box. It is
 * the containing block for that fixed box, and it clips it, so the blur stays
 * inside the specimen and adds no width to the page. Compose it on a wrapper
 * of a frame that has `corner.radius_3`.
 */
export const blurStage = stylex.create({
  base: {
    transform: "translateZ(0)",
    overflow: "clip",
    // A squircle clip above the blur layers makes Chrome remove their masks.
    // A round clip does not. A round arc at 0.6 of the radius cuts the same
    // corner as the frame's squircle (see
    // `packages/ui/src/primitives/corner.stylex.ts`).
    borderRadius: "calc(1rem * .6)",
    cornerShape: "round",
  },
});
