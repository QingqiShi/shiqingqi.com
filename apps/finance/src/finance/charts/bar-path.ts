function round(value: number) {
  return String(Math.round(value * 100) / 100);
}

/**
 * The outline of one bar from `yBase` (the side nearest the baseline) to
 * `yEnd` (the data end), `width` wide from `x`. The data end gets corners of
 * `radius`, clamped to the bar; the baseline side stays square. An empty
 * bar is an empty string, so bars can be joined into one path.
 */
export function barPath(
  x: number,
  yBase: number,
  yEnd: number,
  width: number,
  radius: number,
): string {
  const height = Math.abs(yBase - yEnd);
  if (!(height > 0) || !(width > 0)) return "";
  const toBase = yEnd < yBase ? 1 : -1;
  const r = Math.max(Math.min(radius, width / 2, height), 0);
  const left = round(x);
  const right = round(x + width);
  const base = round(yBase);
  const end = round(yEnd);
  if (r < 0.5) return `M${left},${base}V${end}H${right}V${base}Z`;
  const shoulder = round(yEnd + toBase * r);
  return (
    `M${left},${base}V${shoulder}` +
    `Q${left},${end} ${round(x + r)},${end}` +
    `H${round(x + width - r)}` +
    `Q${right},${end} ${right},${shoulder}` +
    `V${base}Z`
  );
}
