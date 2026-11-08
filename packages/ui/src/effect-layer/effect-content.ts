import { EFFECT_DRAWN_ATTRIBUTE } from "./mark-effect-drawn.ts";

/**
 * The attribute of a registered element whose content an effect can draw
 * from a snapshot, such as the track of a SegmentedControl. The snapshot
 * holds the element's children in their places in its border box, as
 * `contentAt` reads it. It leaves out the element's own fill, border, shadow
 * and outline: the surface under the content.
 *
 * @internal
 */
export const EFFECT_CONTENT = "data-effect-content";

/**
 * The attribute of an element in the content of an `EFFECT_CONTENT`
 * element that an effect draws itself, so the snapshot leaves it out: with
 * no value the element and all of its content, such as an indicator, and
 * with `"surface"` only its own fill, border, shadow and outline, such as a
 * segment.
 *
 * @internal
 */
export const EFFECT_OMIT = "data-effect-omit";

/**
 * The elements that `EFFECT_OMIT` leaves out with all of their content.
 *
 * @internal
 */
export const OMITTED = `[${EFFECT_OMIT}]:not([${EFFECT_OMIT}="surface"])`;

/**
 * The attribute of an `EFFECT_CONTENT` element, or of a part of its content
 * such as a segment, while an effect draws its content from the snapshot in
 * place of the page: its styles then hide that content with
 * `filter: opacity(0)`, and keep its own surface. The snapshot does not
 * copy `filter`, so it still shows the content as it is.
 *
 * @internal
 */
export const EFFECT_CONTENT_DRAWN = "data-effect-content-drawn";

/**
 * The attributes that the effect layer writes to tell that an effect draws
 * in the place of an element or of its content. They change nothing that the
 * layer measures or copies into a snapshot.
 *
 * @internal
 */
export const EFFECT_MARKS: ReadonlySet<string> = new Set([
  EFFECT_DRAWN_ATTRIBUTE,
  EFFECT_CONTENT_DRAWN,
]);

/**
 * How an effect draws over the content of an `EFFECT_CONTENT` element. With
 * `"cover"`, it draws the surface under the content too, so it can draw
 * over the content of the page where it needs to. With `"own"`, it cannot
 * draw that surface, such as Glass, so it draws the content, or the parts
 * of it that it names, and those hide their own.
 *
 * @internal
 */
export type ContentMode = "cover" | "own";
