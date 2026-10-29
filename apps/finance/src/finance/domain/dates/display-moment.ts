import { displayLocale } from "./display-day.ts";

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(displayLocale(locale), {
      ...options,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/** A time of day on this device's clock, always 24-hour: "04:15". */
export function displayTime(moment: string | Date, locale: string): string {
  return formatterFor(locale, {}).format(new Date(moment));
}

/**
 * A moment on this device's clock, day first with a 24-hour time:
 * "10 Oct, 04:15" or "10月10日 04:15". The year shows only when it is not
 * this year.
 */
export function displayMoment(
  moment: string | Date,
  locale: string,
  now: Date = new Date(),
): string {
  const date = new Date(moment);
  return formatterFor(locale, {
    day: "numeric",
    month: "short",
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  }).format(date);
}
