export function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toLocaleString("en-GB")}%`;
}

export function formatPoints(value: number): string {
  const rounded = Math.ceil(value * 10 - 1e-9) / 10;
  return `${rounded.toLocaleString("en-GB")} percentage point${rounded === 1 ? "" : "s"}`;
}

export function formatCount(value: number, noun: string): string {
  return `${value.toLocaleString("en-GB")} ${noun}${value === 1 ? "" : "s"}`;
}
