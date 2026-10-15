/**
 * The PCG hash: a random `u32` for each `u32`, the same for the same input.
 *
 * @internal
 */
export const PCG_WGSL = /* wgsl */ `
fn pcg(value: u32) -> u32 {
  let state = value * 747796405u + 2891336453u;
  let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
  return (word >> 22u) ^ word;
}
`;

/**
 * `pcg` of `PCG_WGSL` on the CPU, for a whole number `n`, which it wraps to
 * 32 bits as WGSL's `u32` does.
 *
 * @internal
 */
export function pcg(n: number) {
  const state = (Math.imul(n >>> 0, 747796405) + 2891336453) >>> 0;
  const word =
    Math.imul(((state >>> ((state >>> 28) + 4)) ^ state) >>> 0, 277803737) >>>
    0;
  return ((word >>> 22) ^ word) >>> 0;
}
