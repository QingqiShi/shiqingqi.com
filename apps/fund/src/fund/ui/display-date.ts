import type { SupportedLocale } from "@tuja/i18n/types";

const STYLES = {
  /** 23 Nov · 11月23日 */
  day: { day: "numeric", month: "short" },
  /** Mon 23 Nov · 11月23日周一 */
  weekday: { weekday: "short", day: "numeric", month: "short" },
  /** Monday · 星期一 */
  weekdayOnly: { weekday: "long" },
  /** 23 Nov 2026 · 2026年11月23日 */
  dayYear: { day: "numeric", month: "short", year: "numeric" },
  /** Monday 23 November 2026 · 2026年11月23日星期一 */
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
} satisfies Record<string, Intl.DateTimeFormatOptions>;

const formats = new Map<string, Intl.DateTimeFormat>();

/** A calendar date, `YYYY-MM-DD`, written for people in `locale`. */
export function displayDate(
  date: string,
  locale: SupportedLocale,
  style: keyof typeof STYLES = "day",
): string {
  const key = `${locale}:${style}`;
  let format = formats.get(key);
  if (format === undefined) {
    format = new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "en-GB", {
      ...STYLES[style],
      timeZone: "UTC",
    });
    formats.set(key, format);
  }
  return format.format(new Date(`${date}T00:00:00Z`));
}
