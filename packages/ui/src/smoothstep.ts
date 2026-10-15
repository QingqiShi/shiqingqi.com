import { clamp } from "./clamp.ts";

/**
 * 0 at `edge0` or before it, 1 at `edge1` or past it, and a smooth step
 * between, as WGSL's `smoothstep`.
 *
 * @internal
 */
export function smoothstep(edge0: number, edge1: number, value: number) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
