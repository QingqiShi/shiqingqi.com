/** The most x positions a chart draws, whatever the range. */
export const MAX_CHART_POINTS = 400;

/**
 * Evenly spaced epoch days from `start` to `end`, both included: every day
 * when the range has at most `maxPoints` days, else one day every `stride`
 * days counted back from `end`, so the last point is always today.
 */
export function sampleDays(
  start: number,
  end: number,
  maxPoints = MAX_CHART_POINTS,
  leadInDays = 0,
): { days: Int32Array; stride: number; firstVisible: number } {
  const span = Math.max(end - start, 0);
  const stride = span + 1 <= maxPoints ? 1 : Math.ceil(span / (maxPoints - 1));
  const visible = Math.floor(span / stride) + 1;
  const lead = Math.ceil(leadInDays / stride);
  const extraStart = (end - start) % stride === 0 ? 0 : 1;
  const days = new Int32Array(lead + extraStart + visible);
  let index = days.length - 1;
  for (let day = end; day >= start; day -= stride) days[index--] = day;
  if (extraStart === 1) days[index--] = start;
  for (let step = 1; index >= 0; step++) days[index--] = start - step * stride;
  return { days, stride, firstVisible: lead };
}
