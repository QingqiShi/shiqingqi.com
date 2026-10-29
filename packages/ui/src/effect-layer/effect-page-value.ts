import type {
  EffectElement,
  EffectPage,
  EffectRange,
  EffectScope,
} from "./page-layout.ts";
import { isViewportCarrier } from "./resolve-carrier.ts";
import type {
  EffectElementRecord,
  EffectInput,
  EffectPointer,
  EffectScope as EffectScopeRecord,
  ElementRange,
} from "./types.ts";

/**
 * The bit of `EffectElement.flags` for an element on the viewport or on its
 * bottom edge.
 *
 * @internal
 */
export const ELEMENT_FIXED = 1;

/**
 * An index into a buffer of `pageLayout` that points at nothing, such as
 * `EffectScope.container` on the page, which has no Effect container.
 *
 * @internal
 */
export const NO_INDEX = 0xff_ff_ff_ff;

/**
 * The bits of `EffectPage.pointerFlags`.
 *
 * @internal
 */
export const POINTER_PRESENT = 1;
/** @internal */
export const POINTER_PRESSED = 2;

/**
 * `effectElements[index]` for an element of `EffectFrame.elements`.
 *
 * @internal
 */
export function effectElementValue(
  element: EffectElementRecord,
): EffectInput<typeof EffectElement> {
  return {
    rect: [element.x, element.y, element.width, element.height],
    radii: element.radii,
    fill: element.fill,
    roles: element.roles,
    flags: isViewportCarrier(element.carrier) ? ELEMENT_FIXED : 0,
    cornerExponent: element.cornerExponent,
    id: element.id,
    scope: element.scopeIndex,
    grayscale: element.grayscale,
  };
}

/**
 * `effectScopes[index]` for a scope of `EffectFrame.scopes`.
 *
 * @internal
 */
export function effectScopeValue(
  scope: EffectScopeRecord,
): EffectInput<typeof EffectScope> {
  return {
    id: scope.id,
    container: scope.container === -1 ? NO_INDEX : scope.container,
  };
}

/**
 * The entries of `effectRanges`: the ranges of each scope, scope after scope.
 *
 * @internal
 */
export function effectRangeValues(
  scopes: readonly EffectScopeRecord[],
): EffectInput<typeof EffectRange>[] {
  return scopes.flatMap(({ ranges }) =>
    ranges.map(
      ({ firstElement, elementCount }: ElementRange) =>
        [firstElement, elementCount] as const,
    ),
  );
}

/**
 * `effectPage` for this frame.
 *
 * @internal
 */
export function effectPageValue(values: {
  viewport: readonly [number, number, number, number];
  pointer: EffectPointer;
  documentSize: readonly [number, number];
  seconds: number;
  delta: number;
  elementCount: number;
  scopeCount: number;
  carrierCount: number;
}): EffectInput<typeof EffectPage> {
  const { pointer } = values;
  return {
    viewport: values.viewport,
    pointerPosition: [pointer.x, pointer.y],
    pointerVelocity: [pointer.velocityX, pointer.velocityY],
    documentSize: values.documentSize,
    seconds: values.seconds,
    delta: values.delta,
    elementCount: values.elementCount,
    pointerFlags:
      (pointer.present ? POINTER_PRESENT : 0) |
      (pointer.pressed ? POINTER_PRESSED : 0),
    scopeCount: values.scopeCount,
    carrierCount: values.carrierCount,
  };
}
