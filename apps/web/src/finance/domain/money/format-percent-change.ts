const formatters = new Map<string, Intl.NumberFormat>();

/** `+13.56%` for a change of `change` on `from`, or null when `from` is 0. */
export function formatPercentChange(
  change: number,
  from: number,
  locale: string,
): string | null {
  if (from === 0) return null;
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "percent",
      signDisplay: "exceptZero",
      maximumFractionDigits: 2,
    });
    formatters.set(locale, formatter);
  }
  return formatter.format(change / Math.abs(from));
}
