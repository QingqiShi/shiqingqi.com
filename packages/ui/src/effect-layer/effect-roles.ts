/**
 * The jobs an element can have in an effect, in bit order: role `i` is bit
 * `1 << i` of an element's `roles`, and WGSL reads it as the constant
 * `EFFECT_ROLE_<NAME>`. Each effect adds its roles at the end, so the bits of
 * the others stay the same.
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
  "sweep",
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

/**
 * The WGSL constant for each role: `EFFECT_ROLE_EXTRACTOR_FAN` for
 * `"extractorFan"`.
 *
 * @internal
 */
export function roleConstantsWgsl(roles: readonly string[]): string {
  return roles
    .map((role, bit) => {
      const name = role.replaceAll(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
      return `const EFFECT_ROLE_${name} = ${String(2 ** bit)}u;`;
    })
    .join("\n");
}
