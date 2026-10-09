/**
 * Marks an element with `data-effect-drawn` while an effect draws in its
 * place, so that its own styles can hide what the effect draws instead.
 *
 * @internal
 */
export function markEffectDrawn(element: Element, drawn: boolean) {
  element.toggleAttribute("data-effect-drawn", drawn);
}
