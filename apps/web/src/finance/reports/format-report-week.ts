import { displayDay } from "../domain/dates/display-day.ts";

function formatDay(day: string, locale: string, withYear: boolean) {
  return displayDay(day, locale, withYear ? "dayYear" : "day");
}

/**
 * A Report week for display: `28 Sept – 4 Oct 2026` or
 * `2026年9月28日 – 10月4日`. The year shows once, or on both days when the
 * week crosses a year end.
 */
export function formatReportWeek(
  periodStart: string,
  periodEnd: string,
  locale: string,
  { withYear = true }: { withYear?: boolean } = {},
): string {
  const crossesYear = periodStart.slice(0, 4) !== periodEnd.slice(0, 4);
  const yearFirst = locale !== "en";
  const start = formatDay(
    periodStart,
    locale,
    withYear && (crossesYear || yearFirst),
  );
  const end = formatDay(
    periodEnd,
    locale,
    withYear && (crossesYear || !yearFirst),
  );
  return `${start} – ${end}`;
}
