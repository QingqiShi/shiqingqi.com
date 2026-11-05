/** Where a label at `x` sits: within `edge` of a side, it aligns to that side and stays inside it. */
export function placeLabel(
  x: number,
  left: number,
  right: number,
  edge: number,
) {
  if (x < left + edge)
    return { x: Math.max(x, left), anchor: "start" as const };
  if (x > right - edge)
    return { x: Math.min(x, right), anchor: "end" as const };
  return { x, anchor: "middle" as const };
}
