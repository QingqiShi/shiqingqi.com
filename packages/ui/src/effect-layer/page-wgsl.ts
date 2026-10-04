import { EFFECT_ROLES, roleConstantsWgsl } from "./effect-roles.ts";
import { PAGE_SCOPE } from "./plan-scopes.ts";
import type {
  EffectElementRecord,
  EffectPointer,
  EffectScope,
} from "./types.ts";

const ELEMENT_FIXED = 1;
const NO_CONTAINER = 0xff_ff_ff_ff;
const POINTER_PRESENT = 1;
const POINTER_PRESSED = 2;

/**
 * The WGSL side of group 0 in every effect's pipelines, render or compute:
 * the page this frame, every registered element in one storage buffer, and
 * every scope in another.
 * Coordinates are page coordinates, CSS px from the top-left corner of the
 * document, for fixed elements too.
 *
 * - `effectPage.elementCount` is how many entries of `effectElements` are in
 *   use; the buffer can be longer.
 * - `roles` holds one `EFFECT_ROLE_*` bit per role.
 * - `radii` is top-left, top-right, bottom-right, bottom-left.
 * - `fill` is the computed `background-color`, sRGB-encoded, with straight
 *   alpha.
 * - `flags` holds `EFFECT_ELEMENT_FIXED`.
 * - `id` stays the same while the element stays registered, so a compute
 *   pass can keep state per element across frames.
 * - `scope` is the index in `effectScopes` of the scope the element is in,
 *   `EFFECT_PAGE_SCOPE` on the page.
 * - `effectScopes` has the scopes as `EffectFrame.scopes` orders them. Each
 *   has its `id`, which stays the same across frames, so a compute pass can
 *   keep it; the index in `effectElements` of its Effect container, or
 *   `EFFECT_NO_CONTAINER` on the page; and its elements in the document,
 *   then its fixed ones, each as the index of the first and the count.
 *
 * Put it at the start of a compute shader. `TARGET_WGSL` already includes it.
 *
 * @internal
 */
export const PAGE_WGSL = /* wgsl */ `
struct EffectPage {
  viewport: vec4f,
  pointerPosition: vec2f,
  pointerVelocity: vec2f,
  documentSize: vec2f,
  seconds: f32,
  delta: f32,
  elementCount: u32,
  pointerFlags: u32,
  scopeCount: u32,
}

struct EffectElement {
  rect: vec4f,
  radii: vec4f,
  fill: vec4f,
  roles: u32,
  flags: u32,
  cornerExponent: f32,
  id: u32,
  scope: u32,
}

struct EffectScope {
  id: u32,
  container: u32,
  ranges: array<vec2u, 2>,
}

const EFFECT_POINTER_PRESENT = ${String(POINTER_PRESENT)}u;
const EFFECT_POINTER_PRESSED = ${String(POINTER_PRESSED)}u;
const EFFECT_ELEMENT_FIXED = ${String(ELEMENT_FIXED)}u;
const EFFECT_NO_CONTAINER = ${String(NO_CONTAINER)}u;
const EFFECT_PAGE_SCOPE = ${String(PAGE_SCOPE)}u;
${roleConstantsWgsl(EFFECT_ROLES)}

@group(0) @binding(0) var<uniform> effectPage: EffectPage;
@group(0) @binding(1) var<storage, read> effectElements: array<EffectElement>;
@group(0) @binding(2) var<storage, read> effectScopes: array<EffectScope>;

// The signed distance from a page point to the element's border box: below
// zero inside, zero on the edge. Exact on the edge; near a corner that is not
// a circular arc, an estimate off it.
fn effectElementDistance(element: EffectElement, page: vec2f) -> f32 {
  let halfSize = element.rect.zw * 0.5;
  let local = page - element.rect.xy - halfSize;
  let side = select(element.radii.xw, element.radii.yz, local.x > 0.0);
  let radius = select(side.x, side.y, local.y > 0.0);
  let inner = abs(local) - halfSize + radius;
  let outside = max(inner, vec2f(0.0));
  var corner = length(outside);
  if (radius > 0.0 && element.cornerExponent != 2.0) {
    let n = element.cornerExponent;
    let unit = max(outside / radius, vec2f(1e-6));
    corner = pow(pow(unit.x, n) + pow(unit.y, n), 1.0 / n) * radius;
  }
  return min(max(inner.x, inner.y), 0.0) + corner - radius;
}
`;

/**
 * The byte size of one `EffectElement`.
 *
 * @internal
 */
export const ELEMENT_BYTES = 80;

/**
 * The byte size of the uniform buffer behind `effectPage`.
 *
 * @internal
 */
export const PAGE_UNIFORM_BYTES = 64;

const ELEMENT_WORDS = ELEMENT_BYTES / 4;

/**
 * Packs the elements in order as `EffectElement` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packElements(
  elements: readonly EffectElementRecord[],
  buffer: ArrayBuffer,
) {
  const floats = new Float32Array(buffer);
  const words = new Uint32Array(buffer);
  for (const [index, element] of elements.entries()) {
    const at = index * ELEMENT_WORDS;
    floats.set([element.x, element.y, element.width, element.height], at);
    floats.set(element.radii, at + 4);
    floats.set(element.fill, at + 8);
    words[at + 12] = element.roles;
    words[at + 13] = element.fixed ? ELEMENT_FIXED : 0;
    floats[at + 14] = element.cornerExponent;
    words[at + 15] = element.id;
    words[at + 16] = element.scopeIndex;
  }
}

/**
 * The byte size of one `EffectScope`.
 *
 * @internal
 */
export const SCOPE_BYTES = 24;

/**
 * Packs the scopes in order as `EffectScope` structs at the start of
 * `buffer`, which must hold at least that many.
 *
 * @internal
 */
export function packScopes(
  scopes: readonly EffectScope[],
  buffer: ArrayBuffer,
) {
  const words = new Uint32Array(buffer);
  for (const [index, scope] of scopes.entries()) {
    words.set(
      [
        scope.id,
        scope.container === -1 ? NO_CONTAINER : scope.container,
        scope.scroll.firstElement,
        scope.scroll.elementCount,
        scope.fixed.firstElement,
        scope.fixed.elementCount,
      ],
      (index * SCOPE_BYTES) / 4,
    );
  }
}

const pageUniform = new ArrayBuffer(PAGE_UNIFORM_BYTES);
const pageFloats = new Float32Array(pageUniform);
const pageWords = new Uint32Array(pageUniform);

/**
 * Packs the values of `effectPage` in field order, into one buffer that
 * every call reuses. `GPUQueue.writeBuffer` copies it at once.
 *
 * @internal
 */
export function packPageUniform(values: {
  viewport: readonly [number, number, number, number];
  pointer: EffectPointer;
  documentSize: readonly [number, number];
  seconds: number;
  delta: number;
  elementCount: number;
  scopeCount: number;
}) {
  const { pointer } = values;
  pageFloats.set(values.viewport, 0);
  pageFloats.set(
    [pointer.x, pointer.y, pointer.velocityX, pointer.velocityY],
    4,
  );
  pageFloats.set(values.documentSize, 8);
  pageFloats[10] = values.seconds;
  pageFloats[11] = values.delta;
  pageWords[12] = values.elementCount;
  pageWords[13] =
    (pointer.present ? POINTER_PRESENT : 0) |
    (pointer.pressed ? POINTER_PRESSED : 0);
  pageWords[14] = values.scopeCount;
  return pageUniform;
}
