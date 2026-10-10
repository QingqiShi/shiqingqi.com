const formatters = new Map<string, Intl.NumberFormat>();

/**
 * A share or a change as a short percent: whole percents from 10 % up, one
 * decimal below that. `signed` adds + or −, for a change.
 */
export function formatPercent(
  fraction: number,
  locale: string,
  signed = false,
): string {
  const digits = Math.abs(fraction) < 0.1 ? 1 : 0;
  const key = `${locale}|${String(digits)}|${String(signed)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: digits,
      signDisplay: signed ? "exceptZero" : "auto",
    });
    formatters.set(key, formatter);
  }
  return formatter.format(fraction);
}
