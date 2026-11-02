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

/** The day of a report in the list, such as "Mon, 2 Nov". */
export function formatListDay(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
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

/** The month of a `YYYY-MM`, such as "November 2026". */
export function formatMonth(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dateOfLocalDate(`${month}-01`));
}

/** The weekday of a `YYYY-MM-DD`, such as "Sunday". */
export function formatWeekday(localDate: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    timeZone: "UTC",
  }).format(dateOfLocalDate(localDate));
}

/** A weekday from 1 for Monday to 7 for Sunday, such as "Mon". */
export function formatShortWeekday(weekday: number, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    timeZone: "UTC",
  }).format(dateOfLocalDate(`2024-01-0${String(weekday)}`));
}

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateOfLocalDate(to).getTime() - dateOfLocalDate(from).getTime()) /
      86_400_000,
  );
}
