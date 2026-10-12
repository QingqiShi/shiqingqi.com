import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay, displayWeekday } from "../domain/dates/display-day.ts";
import { weekdayOf } from "../domain/dates/start-of-week.ts";
import {
  daysInMonth,
  formatDay,
  parseDay,
} from "../domain/dates/to-epoch-day.ts";
import { fillTemplate } from "../reports/fill-template.ts";
import type { RuleSchedule } from "../rules/next-occurrence.ts";

/** Says when a Rule happens: "Monthly on day 1, or the next working day", "每月最后一天，遇周末或节假日提前". */
export function useDescribeSchedule(): (schedule: RuleSchedule) => string {
  const locale = useLocale();
  const once = {
    week: t({ en: "Weekly on {weekday}", zh: "每{weekday}" }),
    month: t({ en: "Monthly on day {day}", zh: "每月 {day} 日" }),
    monthLast: t({ en: "Monthly on the last day", zh: "每月最后一天" }),
    year: t({ en: "Yearly on {date}", zh: "每年{date}" }),
  };
  const every = {
    week: t({ en: "Every {n} weeks on {weekday}", zh: "每 {n} 周的{weekday}" }),
    month: t({
      en: "Every {n} months on day {day}",
      zh: "每 {n} 个月的 {day} 日",
    }),
    monthLast: t({
      en: "Every {n} months on the last day",
      zh: "每 {n} 个月的最后一天",
    }),
    year: t({ en: "Every {n} years on {date}", zh: "每 {n} 年的{date}" }),
  };
  const moves = {
    next: t({ en: "or the next working day", zh: "遇周末或节假日顺延" }),
    previous: t({
      en: "or the working day before",
      zh: "遇周末或节假日提前",
    }),
  };
  const separator = locale === "zh" ? "，" : ", ";

  function describeCycle(schedule: RuleSchedule) {
    const templates = schedule.interval === 1 ? once : every;
    const n = String(schedule.interval);
    switch (schedule.unit) {
      case "week": {
        const weekday = schedule.weekday ?? weekdayOf(schedule.startsOn);
        return fillTemplate(templates.week, {
          n,
          weekday: displayWeekday(weekday, locale),
        });
      }
      case "month": {
        const day =
          schedule.dayOfMonth ?? parseDay(schedule.startsOn).dayOfMonth;
        return fillTemplate(
          day === 31 ? templates.monthLast : templates.month,
          {
            n,
            day: String(day),
          },
        );
      }
      case "year": {
        const start = parseDay(schedule.startsOn);
        const month = schedule.monthOfYear ?? start.month;
        const day = schedule.dayOfMonth ?? start.dayOfMonth;
        return fillTemplate(templates.year, {
          n,
          date: displayDay(
            // 2000 is a leap year, so 29 February shows as it is.
            formatDay(2000, month, Math.min(day, daysInMonth(2000, month))),
            locale,
            "day",
          ),
        });
      }
    }
  }

  return (schedule) => {
    const when = describeCycle(schedule);
    return schedule.nonBusinessDay === "stay"
      ? when
      : `${when}${separator}${moves[schedule.nonBusinessDay]}`;
  };
}
