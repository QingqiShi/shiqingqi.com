import type { SupportedLocale } from "@tuja/i18n/types";

// Trip dates are calendar dates, so they format in UTC to stay on the same day
// everywhere.
const DATE_LOCALES: Record<SupportedLocale, string> = {
  en: "en-GB",
  zh: "zh-CN",
};

const monthDay = {
  en: new Intl.DateTimeFormat(DATE_LOCALES.en, {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  }),
  zh: new Intl.DateTimeFormat(DATE_LOCALES.zh, {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
  }),
};

const weekdayFormat = {
  en: new Intl.DateTimeFormat(DATE_LOCALES.en, {
    timeZone: "UTC",
    weekday: "short",
  }),
  zh: new Intl.DateTimeFormat(DATE_LOCALES.zh, {
    timeZone: "UTC",
    weekday: "short",
  }),
};

const englishRange = new Intl.DateTimeFormat(DATE_LOCALES.en, {
  timeZone: "UTC",
  year: "numeric",
  month: "long",
  day: "numeric",
});

function utcDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`);
}

function parts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

/** "18 June", "6月18日" */
export function dateLabel(iso: string, locale: SupportedLocale): string {
  return monthDay[locale].format(utcDate(iso));
}

/** "Thu", "周四" */
export function weekdayLabel(iso: string, locale: SupportedLocale): string {
  return weekdayFormat[locale].format(utcDate(iso));
}

/** "11–15 June 2026", "2026 年 6 月 11 – 15 日" */
export function dateRangeLabel(
  days: { date: string }[],
  locale: SupportedLocale,
): string {
  const first = days[0].date;
  const last = days[days.length - 1].date;
  if (locale === "en") {
    return englishRange.formatRange(utcDate(first), utcDate(last));
  }
  const a = parts(first);
  const b = parts(last);
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
