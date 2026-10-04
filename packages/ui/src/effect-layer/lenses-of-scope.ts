import { SCENE_LAYOUT } from "./black-hole-wgsl.ts";
import { roleBits } from "./effect-roles.ts";
import {
  EFFECT_SETTING_DEFAULTS,
  finiteOr,
} from "./effect-setting-defaults.ts";
import {
  largestBendIn,
  lensFromBox,
  type Lens,
  type PageRect,
} from "./lens-from-box.ts";
import { indicesIn } from "./plan-scopes.ts";
import type { EffectElementRecord, EffectScope } from "./types.ts";

const BLACK_HOLE = roleBits(["blackHole"]);

/**
 * A lens with the index of its element in `effectElements`.
 *
 * @internal
 */
export interface ShaderLens {
  readonly lens: Lens;
  readonly element: number;
}

/**
 * The Black holes of one scope, on either `<canvas>` element, the ones that
 * bend light most in `viewport` first, at most `SCENE_LAYOUT.maxLenses`. A
 * lens bends only the light of its own scope.
 *
 * @internal
 */
export function lensesOfScope(
  elements: readonly EffectElementRecord[],
  scope: Pick<EffectScope, "scroll" | "fixed">,
  viewport: PageRect,
): ShaderLens[] {
  const lenses: ShaderLens[] = [];
  for (const element of [
    ...indicesIn(scope.scroll),
    ...indicesIn(scope.fixed),
  ]) {
    const record = elements[element];
    if ((record.roles & BLACK_HOLE) === 0) {
      continue;
    }
    const mass = finiteOr(
      record.settings.blackHole?.mass,
      EFFECT_SETTING_DEFAULTS.blackHole.mass,
    );
    lenses.push({ lens: lensFromBox(record, mass), element });
  }
  return lenses
    .sort(
      (first, second) =>
        largestBendIn(second.lens, viewport) -
        largestBendIn(first.lens, viewport),
    )
    .slice(0, SCENE_LAYOUT.maxLenses);
}
