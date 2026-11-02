"use client";

import { RepeatIcon } from "@phosphor-icons/react/dist/ssr/Repeat";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { yearlyMonthDay, type RepeatRule } from "../report/next-occurrence.ts";
import { formatShortDate, formatShortWeekday } from "./format-day.ts";

function useRepeatText(rule: RepeatRule, locale: string) {
  const every = "every" in rule ? rule.every : 1;
  const once = every === 1;
  const daily = once
    ? t({ en: "Every day", zh: "每天" })
    : t({ en: "Every {n} days", zh: "每 {n} 天" });
  const weekly = once
    ? t({ en: "Every week on {days}", zh: "每周{days}" })
    : t({ en: "Every {n} weeks on {days}", zh: "每 {n} 周的{days}" });
  const monthly = once
    ? t({ en: "Every month on day {day}", zh: "每月 {day} 日" })
    : t({ en: "Every {n} months on day {day}", zh: "每 {n} 个月的 {day} 日" });
  const monthEnd = once
    ? t({ en: "Every month on the last day", zh: "每月最后一天" })
    : t({
        en: "Every {n} months on the last day",
        zh: "每 {n} 个月的最后一天",
      });
  const yearly = once
    ? t({ en: "Every year on {date}", zh: "每年 {date}" })
    : t({ en: "Every {n} years on {date}", zh: "每 {n} 年的 {date}" });
  const afterDone =
    rule.kind === "after-done" && rule.days === 1
      ? t({ en: "The day after I finish it", zh: "完成后第二天" })
      : t({ en: "{n} days after I finish it", zh: "完成 {n} 天后" });
  const interval = String(every);
  switch (rule.kind) {
    case "daily":
      return daily.replace("{n}", interval);
    case "weekly":
      return weekly
        .replace("{n}", interval)
        .replace(
          "{days}",
          new Intl.ListFormat(locale).format(
            rule.weekdays.map((day) => formatShortWeekday(day, locale)),
          ),
        );
    case "monthly":
      return rule.day === "last"
        ? monthEnd.replace("{n}", interval)
        : monthly.replace("{n}", interval).replace("{day}", String(rule.day));
    case "yearly":
      return yearly
        .replace("{n}", interval)
        .replace(
          "{date}",
          formatShortDate(`2024-${yearlyMonthDay(rule)}`, locale),
        );
    case "after-done":
      return afterDone.replace("{n}", String(rule.days));
  }
}

/** How a to-do repeats, in words. */
export function RepeatLabel({
  rule,
  locale,
}: {
  rule: RepeatRule;
  locale: string;
}) {
  return (
    <Text look="caption" tone="muted" css={styles.label}>
      <RepeatIcon weight="bold" aria-hidden />
      {useRepeatText(rule, locale)}
    </Text>
  );
}

const styles = stylex.create({
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
  },
});
