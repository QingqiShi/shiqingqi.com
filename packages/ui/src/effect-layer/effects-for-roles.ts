import { blackHoleEffect } from "./black-hole-effect.ts";
import { dustEffect } from "./dust-effect.ts";
import { EFFECT_ROLES, type EffectRole } from "./effect-roles.ts";
import { rippleEffect } from "./ripple-effect.ts";
import type { Effect } from "./types.ts";

/**
 * The effect that draws each role; every role needs one. Two roles of one
 * effect, such as the elements that shed particles and the ones that pull
 * them in, name the same effect.
 */
const ROLE_EFFECTS = new Map<EffectRole, Effect>([
  ["ripple", rippleEffect],
  ["rippleAmbient", rippleEffect],
  ["dust", dustEffect],
  ["extractorFan", dustEffect],
  ["blackHole", blackHoleEffect],
  ["lightBeam", blackHoleEffect],
]);

/**
 * The effects to run for a set of role bits, each once.
 *
 * @internal
 */
export function effectsForRoles(roles: number): Effect[] {
  const effects = new Set<Effect>();
  for (const [bit, role] of EFFECT_ROLES.entries()) {
    const effect = ROLE_EFFECTS.get(role);
    if ((roles & (1 << bit)) !== 0 && effect !== undefined) {
      effects.add(effect);
    }
  }
  return [...effects];
}
