import { formatLocalTime, localTimeAt } from "../calendar/ics/instant-of.ts";
import { keepTogether } from "../shell/keep-together.ts";

/** A `YYYY-MM-DD` as the date it names, at noon UTC, so that formatting it in UTC never changes the day. */
export function dateOfLocalDate(localDate: string): Date {
  return new Date(`${localDate.slice(0, 10)}T12:00:00Z`);
}

/**
 * The weekday where a date spells it out. Chinese takes the short form (周一) in
 * all dates, because the long form (星期一) beside it in a list looks like a
 * different format.
 */
function longWeekday(locale: string) {
  return locale.startsWith("zh") ? "short" : "long";
}

function formatLocalDate(
  localDate: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return keepTogether(
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" }).format(
      dateOfLocalDate(localDate),
    ),
  );
}

/** The day of a report, such as "Monday, 2 November". */
export function formatDay(localDate: string, locale: string): string {
  return formatLocalDate(localDate, locale, {
    weekday: longWeekday(locale),
    month: "long",
    day: "numeric",
  });
}

/** The day of a report in the list, such as "Mon, 2 Nov". */
export function formatListDay(localDate: string, locale: string): string {
  return formatLocalDate(localDate, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** A short date such as "4 Nov", for a due date. */
export function formatShortDate(localDate: string, locale: string): string {
  return formatLocalDate(localDate, locale, { month: "short", day: "numeric" });
}

/** The month of a `YYYY-MM`, such as "November 2026". */
export function formatMonth(month: string, locale: string): string {
  return formatLocalDate(`${month}-01`, locale, {
    year: "numeric",
    month: "long",
  });
}

/** The weekday of a `YYYY-MM-DD`, such as "Sunday". */
export function formatWeekday(localDate: string, locale: string): string {
  return formatLocalDate(localDate, locale, { weekday: longWeekday(locale) });
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
  return keepTogether(
    new Intl.DateTimeFormat(locale, {
      ...(isToday ? {} : { month: "short", day: "numeric" }),
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(instant),
  );
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
  return keepTogether(`${formatTimeInZone(start, place)}–${ending}`);
}

/** Whole days from one `YYYY-MM-DD` to another. */
export function daysBetween(from: string, to: string): number {
  return Math.round(
    (dateOfLocalDate(to).getTime() - dateOfLocalDate(from).getTime()) /
      86_400_000,
  );
}
