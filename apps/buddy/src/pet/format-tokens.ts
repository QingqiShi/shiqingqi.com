export function formatTokens(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(n >= 1e10 ? 1 : 2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return String(Math.round(n / 1e3)) + "k";

  return String(Math.round(n));
}

export function formatUsd(usd: number) {
  if (usd < 10) return `$${usd.toFixed(2)}`;

  return `$${withCommas(usd)}`;
}

export function formatLines(n: number) {
  if (n >= 999_500) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 9_950) return String(Math.round(n / 1e3)) + "k";
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;

  return String(Math.round(n));
}

export function withCommas(value: number) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
