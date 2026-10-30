import type { MeasureContext } from "./create-element-tracker.ts";
import { dustReader } from "./dust-effect.ts";
import { roleBits, type EffectRole } from "./effect-roles.ts";
import { liquidReader } from "./liquid-reader.ts";
import type { ElementBox } from "./read-element-box.ts";
import { ringLightReader } from "./ring-light-effect.ts";
import type { EffectReadings } from "./types.ts";

/**
 * What an effect reads of an element with its role, beyond the element's
 * box. The element tracker reads it each time it measures the element, in
 * the read phase of the frame, and puts it in `EffectElementRecord.readings`.
 * Thus an effect's `update` reads nothing from the DOM.
 *
 * @internal
 */
export interface RoleReader<Reading> {
  /**
   * Reads the element. `box` is its border box in viewport coordinates, as
   * it was measured now. Read styles and boxes through `context`, which
   * reads each of them once in the frame.
   */
  readonly read: (
    element: Element,
    box: ElementBox,
    context: MeasureContext,
  ) => Reading;
  /**
   * The other elements whose size the reading uses, such as the segments
   * of a track. The tracker measures the element again when one of them
   * changes size.
   */
  readonly observe?: (element: Element) => Iterable<Element>;
}

/**
 * The readings of an element with `roles`, and the other elements whose
 * size they use.
 *
 * @internal
 */
export function readRoles(
  element: Element,
  roles: number,
  box: ElementBox,
  context: MeasureContext,
): { readings: EffectReadings; observed: Element[] } {
  const observed: Element[] = [];
  const read = <Reading>(role: EffectRole, reader: RoleReader<Reading>) => {
    if ((roles & roleBits([role])) === 0) {
      return undefined;
    }
    observed.push(...(reader.observe?.(element) ?? []));
    return reader.read(element, box, context);
  };
  const readings = {
    liquid: read("liquid", liquidReader),
    ringLight: read("ringLight", ringLightReader),
    dust: read("dust", dustReader),
  } satisfies Record<keyof EffectReadings, unknown>;
  return { readings, observed };
}
