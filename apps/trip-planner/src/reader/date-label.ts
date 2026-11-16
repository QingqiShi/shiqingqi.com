import type { SupportedLocale } from "@tuja/i18n/types";

// The labels are written out by hand, not with Intl: the server and the
// browser carry different versions of the locale data, which differ in
// spaces and short names, and a client page must render the same text on
// both.
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_ZH = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

/** A dash between two dates of more than one word, with thin spaces. */
const RANGE = " – ";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function parts(iso: string): CalendarDate {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function weekday(iso: string) {
  return new Date(`${iso}T00:00:00Z`).getUTCDay();
}

function longMonth(month: number) {
  return MONTHS[month - 1];
}

function shortMonth(month: number) {
  return MONTHS[month - 1].slice(0, 3);
}

/** "18 June", "6月18日" */
export function dateLabel(iso: string, locale: SupportedLocale): string {
  const { month, day } = parts(iso);
  if (locale === "en") return `${String(day)} ${longMonth(month)}`;
  return `${String(month)}月${String(day)}日`;
}

/** "18 Jun", "6月18日" */
export function shortDateLabel(iso: string, locale: SupportedLocale): string {
  const { month, day } = parts(iso);
  if (locale === "en") return `${String(day)} ${shortMonth(month)}`;
  return `${String(month)}月${String(day)}日`;
}

/** "Thu", "周四" */
export function weekdayLabel(iso: string, locale: SupportedLocale): string {
  return (locale === "en" ? WEEKDAYS_EN : WEEKDAYS_ZH)[weekday(iso)];
}

/** "Sun 14 Jun", "6月14日 周日" */
export function dayDateLabel(iso: string, locale: SupportedLocale): string {
  if (locale === "zh") {
    return `${dateLabel(iso, locale)} ${weekdayLabel(iso, locale)}`;
  }
  const { month, day } = parts(iso);
  return `${weekdayLabel(iso, locale)} ${String(day)} ${shortMonth(month)}`;
}

/** "11–15 Jun", "6月11–15日", without the year */
export function shortRangeLabel(
  days: { date: string }[],
  locale: SupportedLocale,
): string {
  const a = parts(days[0].date);
  const b = parts(days[days.length - 1].date);
  if (locale === "en") {
    if (a.month !== b.month) {
      return `${String(a.day)} ${shortMonth(a.month)}${RANGE}${String(b.day)} ${shortMonth(b.month)}`;
    }
    if (a.day === b.day) return `${String(a.day)} ${shortMonth(a.month)}`;
    return `${String(a.day)}–${String(b.day)} ${shortMonth(a.month)}`;
  }
  if (a.month !== b.month) {
    return `${String(a.month)}月${String(a.day)}日–${String(b.month)}月${String(b.day)}日`;
  }
  if (a.day === b.day) return `${String(a.month)}月${String(a.day)}日`;
  return `${String(a.month)}月${String(a.day)}–${String(b.day)}日`;
}

function englishRange(a: CalendarDate, b: CalendarDate) {
  if (a.year !== b.year) {
    return `${String(a.day)} ${longMonth(a.month)} ${String(a.year)}${RANGE}${String(b.day)} ${longMonth(b.month)} ${String(b.year)}`;
  }
  if (a.month !== b.month) {
    return `${String(a.day)} ${longMonth(a.month)}${RANGE}${String(b.day)} ${longMonth(b.month)} ${String(b.year)}`;
  }
  if (a.day === b.day) {
    return `${String(a.day)} ${longMonth(a.month)} ${String(a.year)}`;
  }
  return `${String(a.day)}${RANGE}${String(b.day)} ${longMonth(a.month)} ${String(a.year)}`;
}

/** "11–15 June 2026", "2026 年 6 月 11 – 15 日" */
export function dateRangeLabel(
  days: { date: string }[],
  locale: SupportedLocale,
): string {
  const a = parts(days[0].date);
  const b = parts(days[days.length - 1].date);
  if (locale === "en") return englishRange(a, b);
  if (a.year !== b.year) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日 – ${String(b.year)} 年 ${String(b.month)} 月 ${String(b.day)} 日`;
  }
  if (a.month !== b.month) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日 – ${String(b.month)} 月 ${String(b.day)} 日`;
  }
  if (a.day === b.day) {
    return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} 日`;
  }
  return `${String(a.year)} 年 ${String(a.month)} 月 ${String(a.day)} – ${String(b.day)} 日`;
}
