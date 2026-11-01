/** A `YYYY-MM-DD` as the date it names, at noon UTC, so that formatting it in UTC never changes the day. */
export function dateOfLocalDate(localDate: string): Date {
  return new Date(`${localDate.slice(0, 10)}T12:00:00Z`);
}

/** The day of a report, such as "Monday, 2 November". */
export function formatDay(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOfLocalDate(localDate));
}

/** A short date such as "4 Nov", for a due date. */
export function formatShortDate(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(dateOfLocalDate(localDate));
}

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateOfLocalDate(to).getTime() - dateOfLocalDate(from).getTime()) /
      86_400_000,
  );
}
