import { d, tgpu } from "typegpu";

const ALL_STAGES: ("vertex" | "fragment" | "compute")[] = [
  "vertex",
  "fragment",
  "compute",
];

/**
 * The page this frame. Coordinates are page coordinates, CSS px from the
 * top-left corner of the document, for fixed elements too.
 *
 * - `elementCount` is how many entries of `effectElements` are in use; the
 *   buffer can be longer.
 * - `pointerFlags` holds `POINTER_PRESENT` and `POINTER_PRESSED`.
 * - `carrierCount` is how many ranges each scope has in `effectRanges`.
 *
 * @internal
 */
export const EffectPage = d.struct({
  viewport: d.vec4f,
  pointerPosition: d.vec2f,
  pointerVelocity: d.vec2f,
  documentSize: d.vec2f,
  seconds: d.f32,
  delta: d.f32,
  elementCount: d.u32,
  pointerFlags: d.u32,
  scopeCount: d.u32,
  carrierCount: d.u32,
});

/**
 * One registered element.
 *
 * - `roles` holds one bit per role, as `EFFECT_ROLES` orders them.
 * - `radii` is top-left, top-right, bottom-right, bottom-left.
 * - `fill` is the computed `background-color`, sRGB-encoded, with straight
 *   alpha.
 * - `flags` holds `ELEMENT_FIXED`.
 * - `id` stays the same while the element stays registered, so a compute
 *   pass can keep state per element across frames.
 * - `scope` is the index in `effectScopes` of the scope the element is in,
 *   `PAGE_SCOPE` on the page.
 * - `grayscale` is how far CSS `filter: grayscale()` on the element and its
 *   ancestors takes the colour out of what it paints. Each effect passes
 *   what it draws for the element through `effectGrayscale`, so the effect
 *   is as grey as the element.
 *
 * @internal
 */
export const EffectElement = d.struct({
  rect: d.vec4f,
  radii: d.vec4f,
  fill: d.vec4f,
  roles: d.u32,
  flags: d.u32,
  cornerExponent: d.f32,
  id: d.u32,
  scope: d.u32,
  grayscale: d.f32,
});

/**
 * One scope, in the order of `EffectFrame.scopes`: its `id`, which stays the
 * same across frames, so a compute pass can keep it, and the index in
 * `effectElements` of its Effect container, or `NO_INDEX` on the page.
 *
 * @internal
 */
export const EffectScope = d.struct({
  id: d.u32,
  container: d.u32,
});

/**
 * The first element and the number of elements of one range of a scope.
 *
 * @internal
 */
export const EffectRange = d.vec2u;

/**
 * Group 0 of every effect's pipelines, render or compute: the page this
 * frame, every registered element, every scope, and the elements of each
 * scope on each carrier, as `effectRange` reads them.
 *
 * @internal
 */
export const pageLayout = tgpu
  .bindGroupLayout({
    effectPage: { uniform: EffectPage, visibility: ALL_STAGES },
    effectElements: {
      storage: d.arrayOf(EffectElement),
      visibility: ALL_STAGES,
    },
    effectScopes: { storage: d.arrayOf(EffectScope), visibility: ALL_STAGES },
    effectRanges: { storage: d.arrayOf(EffectRange), visibility: ALL_STAGES },
  })
  .$idx(0);
