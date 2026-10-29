/** True when both lists hold the same ids, in any order and with any repeats. */
export function sameSet(a: readonly string[], b: readonly string[]) {
  const left = new Set(a);
  const right = new Set(b);
  return left.size === right.size && [...left].every((id) => right.has(id));
}
