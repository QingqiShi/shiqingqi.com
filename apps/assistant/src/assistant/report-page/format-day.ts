import { formatLocalTime, localTimeAt } from "../calendar/ics/instant-of.ts";

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

/** A time in the owner's zone: "15:00" today, else "4 Nov, 15:00". */
export function formatTimeInZone(
  time: string,
  {
    today,
    locale,
    timeZone,
  }: { today: string; locale: string; timeZone: string },
): string {
  const instant = new Date(time);
  const isToday =
    formatLocalTime(localTimeAt(instant.getTime(), timeZone), false) === today;
  return new Intl.DateTimeFormat(locale, {
    ...(isToday ? {} : { month: "short", day: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(instant);
}

/** The time that a to-do holds on the calendar: "15:00–16:00" today, else "4 Nov, 15:00–16:00". */
export function formatSlotTime(
  { start, end }: { start: string; end: string },
  place: { today: string; locale: string; timeZone: string },
): string {
  const { locale, timeZone } = place;
  const dayOf = (time: string) =>
    formatLocalTime(localTimeAt(Date.parse(time), timeZone), false);
  const ending =
    dayOf(start) === dayOf(end)
      ? new Intl.DateTimeFormat(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hourCycle: "h23",
          timeZone,
        }).format(new Date(end))
      : formatTimeInZone(end, place);
  return `${formatTimeInZone(start, place)}–${ending}`;
}

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateOfLocalDate(to).getTime() - dateOfLocalDate(from).getTime()) /
      86_400_000,
  );
}
