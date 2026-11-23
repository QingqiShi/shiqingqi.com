const formats = new Map<string, Intl.DateTimeFormat>();

/** The calendar date, `YYYY-MM-DD`, of `instant` in `timeZone`. */
export function exchangeDate(instant: Date, timeZone: string): string {
  let format = formats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    formats.set(timeZone, format);
  }
  return format.format(instant);
}
