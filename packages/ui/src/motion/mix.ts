/**
 * `value` held between 0 and 1.
 *
 * @internal
 */
export function unit(value: number) {
  return Math.min(1, Math.max(0, value));
}

/**
 * 0 up to `from`, 1 from `to` on, and a smooth step between.
 *
 * @internal
 */
export function smoothstep(from: number, to: number, value: number) {
  const t = unit((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/**
 * The value a share `t` of the way from `from` to `to`.
 *
 * @internal
 */
export function mix(from: number, to: number, t: number) {
  return from + (to - from) * t;
}
