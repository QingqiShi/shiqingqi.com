/**
 * The jobs an element can have in an effect, in bit order: role `i` is bit
 * `1 << i` of an element's `roles`, on the CPU and in the shaders, which
 * read it through `roleBits`. Each effect adds its roles at the end, so the
 * bits of the others stay the same.
 *
 * @internal
 */
export const EFFECT_ROLES = [
  "ripple",
  "rippleAmbient",
  "dust",
  "extractorFan",
  "blackHole",
  "lightBeam",
  "liquid",
  "ringLight",
] as const satisfies readonly string[];

/**
 * A job an element can have in an effect.
 *
 * @internal
 */
export type EffectRole = (typeof EFFECT_ROLES)[number];

/**
 * The bits of a set of roles.
 *
 * @internal
 */
export function roleBits(roles: readonly EffectRole[]): number {
  let bits = 0;
  for (const role of roles) {
    bits |= 1 << EFFECT_ROLES.indexOf(role);
  }
  return bits;
}
