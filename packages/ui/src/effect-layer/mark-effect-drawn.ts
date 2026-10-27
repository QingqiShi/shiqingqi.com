/**
 * The attribute an element has while an effect draws in its place.
 *
 * @internal
 */
export const EFFECT_DRAWN_ATTRIBUTE = "data-effect-drawn";

/**
 * Marks an element with `data-effect-drawn` while an effect draws in its
 * place, so that its own styles can hide what the effect draws instead.
 * Those styles keep each box and each colour that an effect reads, so the
 * element tracker does not measure again for the mark.
 *
 * @internal
 */
export function markEffectDrawn(element: Element, drawn: boolean) {
  element.toggleAttribute(EFFECT_DRAWN_ATTRIBUTE, drawn);
}
