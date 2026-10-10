import { toEpochDay } from "./to-epoch-day.ts";

/**
 * How much of a day a label shows. English reads day first ("Thu 15 Oct");
 * Chinese reads month first with the weekday last ("10月15日 周四").
 */
type DisplayDayStyle =
  | "weekday"
  | "weekdayYear"
  | "weekdayLong"
  | "day"
  | "dayYear"
  | "month"
  | "monthYear"
  | "year";

const DATE_PART: Record<DisplayDayStyle, Intl.DateTimeFormatOptions> = {
  weekday: { day: "numeric", month: "short" },
  weekdayYear: { day: "numeric", month: "short", year: "numeric" },
  weekdayLong: { day: "numeric", month: "long" },
  day: { day: "numeric", month: "short" },
  dayYear: { day: "numeric", month: "short", year: "numeric" },
  month: { month: "short" },
  monthYear: { month: "short", year: "numeric" },
  year: { year: "numeric" },
};

const WEEKDAY_PART: Partial<Record<DisplayDayStyle, "short" | "long">> = {
  weekday: "short",
  weekdayYear: "short",
  weekdayLong: "long",
};

const MS_PER_DAY = 86_400_000;
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
