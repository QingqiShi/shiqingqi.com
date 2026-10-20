import { toEpochDay } from "./to-epoch-day.ts";

/**
 * How much of a day a label shows. English reads day first ("Thu 15 Oct");
 * Chinese reads month first with the weekday last ("10月15日 周四").
 */
type DisplayDayStyle =
  | "weekday"
  | "weekdayYear"
  | "day"
  | "dayYear"
  | "month"
  | "monthYear"
  | "year";

const DATE_PART: Record<DisplayDayStyle, Intl.DateTimeFormatOptions> = {
  weekday: { day: "numeric", month: "short" },
  weekdayYear: { day: "numeric", month: "short", year: "numeric" },
  day: { day: "numeric", month: "short" },
  dayYear: { day: "numeric", month: "short", year: "numeric" },
  month: { month: "short" },
  monthYear: { month: "short", year: "numeric" },
  year: { year: "numeric" },
};

const WEEKDAY_PART: Partial<Record<DisplayDayStyle, "short">> = {
  weekday: "short",
  weekdayYear: "short",
};

export const MS_PER_DAY = 86_400_000;
const formatters = new Map<string, Intl.DateTimeFormat>();

/** The Intl locale for a site locale. The Household is in the UK, so English is en-GB. */
export function displayLocale(locale: string): string {
  return locale === "en" ? "en-GB" : locale;
}

function formatterFor(locale: string, options: Intl.DateTimeFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatters.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(displayLocale(locale), {
      ...options,
      timeZone: "UTC",
    });
    formatters.set(key, formatter);
  }
  return formatter;
}

/**
 * A calendar day (`YYYY-MM-DD` or an epoch day) for display, the same way on
 * every Finance screen: "Thu 15 Oct", "15 Oct 2026", "10月15日 周四".
 */
export function displayDay(
  day: string | number,
  locale: string,
  style: DisplayDayStyle = "day",
): string {
  const epochDay = typeof day === "string" ? toEpochDay(day) : day;
  const moment = epochDay * MS_PER_DAY;
  const date = formatterFor(locale, DATE_PART[style]).format(moment);
  const weekdayStyle = WEEKDAY_PART[style];
  if (!weekdayStyle) return date;
  const weekday = formatterFor(locale, { weekday: weekdayStyle }).format(
    moment,
  );
  return locale === "zh" ? `${date} ${weekday}` : `${weekday} ${date}`;
}

/** Two days as a span, "15 Oct 2026 – 18 Oct 2026", or one day when they are the same. */
export function displayDayRange(
  start: string | number,
  end: string | number,
  locale: string,
): string {
  const first = displayDay(start, locale, "dayYear");
  const last = displayDay(end, locale, "dayYear");
  return first === last ? first : `${first} – ${last}`;
}

/** An ISO weekday (1 is Monday) for display: "Mon", "周一". */
export function displayWeekday(weekday: number, locale: string): string {
  // Epoch day 4, 1970-01-05, was a Monday.
  return formatterFor(locale, { weekday: "short" }).format(
    (3 + weekday) * MS_PER_DAY,
  );
}
