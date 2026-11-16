import type { SupportedLocale } from "@tuja/i18n/types";

// Trip dates are calendar dates, so they format in UTC to stay on the same day
// everywhere.
const intlLocale = { en: "en-GB", zh: "zh-CN" } as const;

function formatter(
  locale: SupportedLocale,
  options: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    timeZone: "UTC",
    ...options,
  });
}

const monthDay = {
  en: formatter("en", { month: "long", day: "numeric" }),
  zh: formatter("zh", { month: "long", day: "numeric" }),
};
const weekday = {
  en: formatter("en", { weekday: "short" }),
  zh: formatter("zh", { weekday: "short" }),
};
const monthName = formatter("en", { month: "long" });

function toDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day, monthName: monthName.format(toDate(iso)) };
}

/** "18 June", or "6月18日" */
export function dateLabel(iso: string, locale: SupportedLocale): string {
  return monthDay[locale].format(toDate(iso));
}

/** "Thu", or "周四" */
export function weekdayLabel(iso: string, locale: SupportedLocale): string {
  return weekday[locale].format(toDate(iso));
}

type DateParts = ReturnType<typeof parts>;

function englishRange(a: DateParts, b: DateParts) {
  if (a.year !== b.year) {
    return `${String(a.day)} ${a.monthName} ${String(a.year)} – ${String(b.day)} ${b.monthName} ${String(b.year)}`;
  }
  if (a.month !== b.month) {
    return `${String(a.day)} ${a.monthName} – ${String(b.day)} ${b.monthName} ${String(b.year)}`;
  }
  if (a.day === b.day) {
    return `${String(a.day)} ${a.monthName} ${String(a.year)}`;
  }
  return `${String(a.day)}–${String(b.day)} ${a.monthName} ${String(a.year)}`;
}

function chineseRange(a: DateParts, b: DateParts) {
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

/**
 * The dates of a trip. Within a month: "11–15 June 2026", or
 * "2026 年 6 月 11 – 15 日". Across months: "28 June – 2 July 2026", or
 * "2026 年 6 月 28 日 – 7 月 2 日".
 */
export function dateRangeLabel(
  days: { date: string }[],
  locale: SupportedLocale,
): string {
  const a = parts(days[0].date);
  const b = parts(days[days.length - 1].date);
  return locale === "en" ? englishRange(a, b) : chineseRange(a, b);
}
