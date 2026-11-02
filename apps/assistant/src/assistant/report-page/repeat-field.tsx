"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Chip } from "@tuja/ui/components/chip";
import { Select } from "@tuja/ui/components/select";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  isoWeekday,
  yearlyMonthDay,
  type RepeatRule,
} from "../report/next-occurrence.ts";
import { todoLimits } from "../report/todo-limits.ts";
import { formatShortDate, formatShortWeekday } from "./format-day.ts";

const REPEAT_KINDS = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "after-done",
] as const;
type RepeatKind = (typeof REPEAT_KINDS)[number];

/** What the fields hold, with text as it was typed. */
export interface RepeatDraft {
  kind: RepeatKind;
  interval: string;
  weekdays: readonly number[];
  /** A day of the month, or `last`. */
  monthDay: string;
  /** The `MM-DD` of a yearly rule. */
  yearDate: string;
}

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const SHORT_MONTH_DAY = 29;

/** The fields as a new rule fills them, from the date the to-do has. */
function draftFrom(kind: RepeatKind, interval: string, date: string) {
  return {
    kind,
    interval,
    weekdays: [isoWeekday(date)],
    monthDay: String(Number(date.slice(8))),
    yearDate: date.slice(5),
  };
}

export function repeatDraftOf(
  rule: RepeatRule | null,
  date: string,
): RepeatDraft {
  const draft = draftFrom(rule?.kind ?? "none", "1", date);
  switch (rule?.kind) {
    case "daily":
      return { ...draft, interval: String(rule.every) };
    case "weekly":
      return {
        ...draft,
        interval: String(rule.every),
        weekdays: rule.weekdays,
      };
    case "monthly":
      return {
        ...draft,
        interval: String(rule.every),
        monthDay: String(rule.day),
      };
    case "yearly":
      return {
        ...draft,
        interval: String(rule.every),
        yearDate: yearlyMonthDay(rule),
      };
    case "after-done":
      return { ...draft, interval: String(rule.days) };
    default:
      return draft;
  }
}

/** A yearly rule follows the due date that the owner picks, because it has no date field of its own. */
export function withYearDate(draft: RepeatDraft, date: string): RepeatDraft {
  return { ...draft, yearDate: date.slice(5) };
}

/** The rule of the fields. Null when there is none, and undefined when the interval is not a number it can take. */
export function ruleOfDraft({
  kind,
  interval,
  weekdays,
  monthDay,
  yearDate,
}: RepeatDraft): RepeatRule | null | undefined {
  if (kind === "none") return null;
  const every = Number(interval);
  if (!Number.isInteger(every) || every < 1) return undefined;
  if (every > todoLimits.repeatInterval) return undefined;
  switch (kind) {
    case "daily":
      return { kind, every };
    case "weekly":
      return { kind, every, weekdays };
    case "monthly":
      return {
        kind,
        every,
        day: monthDay === "last" ? "last" : Number(monthDay),
      };
    case "yearly":
      return {
        kind,
        every,
        month: Number(yearDate.slice(0, 2)),
        day: Number(yearDate.slice(3)),
      };
    case "after-done":
      return { kind, days: every };
  }
}

/** How often a to-do comes back, with the fields that this kind of rule asks for. */
export function RepeatField({
  draft,
  date,
  autoFocus,
  error,
  locale,
  onChange,
}: {
  draft: RepeatDraft;
  /** The date a new rule starts from. */
  date: string;
  autoFocus: boolean;
  error?: string;
  locale: string;
  onChange: (draft: RepeatDraft) => void;
}) {
  const intervalLabels: Record<Exclude<RepeatKind, "none">, string> = {
    daily: t({ en: "Every … days", zh: "每 … 天" }),
    weekly: t({ en: "Every … weeks", zh: "每 … 周" }),
    monthly: t({ en: "Every … months", zh: "每 … 个月" }),
    yearly: t({ en: "Every … years", zh: "每 … 年" }),
    "after-done": t({ en: "Days after you finish", zh: "完成后几天" }),
  };
  const shortMonths = t({
    en: "A month without this day uses its last day.",
    zh: "没有这一天的月份，会用当月最后一天。",
  });
  const onDate = t({ en: "On {date}", zh: "在 {date}" });

  return (
    <div css={stack.tight}>
      <Select
        label={t({ en: "Repeat", zh: "重复" })}
        value={draft.kind}
        autoFocus={autoFocus}
        css={styles.field}
        options={[
          { value: "none", label: t({ en: "Does not repeat", zh: "不重复" }) },
          { value: "daily", label: t({ en: "By day", zh: "按天" }) },
          { value: "weekly", label: t({ en: "By week", zh: "按周" }) },
          { value: "monthly", label: t({ en: "By month", zh: "按月" }) },
          { value: "yearly", label: t({ en: "By year", zh: "按年" }) },
          {
            value: "after-done",
            label: t({ en: "After you finish it", zh: "完成后再来" }),
          },
        ]}
        onChange={(event) => {
          onChange(
            draftFrom(
              REPEAT_KINDS.find((kind) => kind === event.target.value) ??
                "none",
              draft.interval || "1",
              date,
            ),
          );
        }}
      />
      {draft.kind === "none" ? null : (
        <>
          <div css={cluster.tight}>
            <TextField
              type="number"
              inputMode="numeric"
              min={1}
              max={todoLimits.repeatInterval}
              label={intervalLabels[draft.kind]}
              value={draft.interval}
              error={error}
              css={styles.field}
              onChange={(event) => {
                onChange({ ...draft, interval: event.target.value });
              }}
            />
            {draft.kind === "monthly" ? (
              <Select
                label={t({ en: "On day", zh: "日期" })}
                value={draft.monthDay}
                options={[
                  ...Array.from({ length: 31 }, (_, index) => ({
                    value: String(index + 1),
                    label: String(index + 1),
                  })),
                  {
                    value: "last",
                    label: t({ en: "Last day", zh: "最后一天" }),
                  },
                ]}
                onChange={(event) => {
                  onChange({ ...draft, monthDay: event.target.value });
                }}
              />
            ) : null}
          </div>
          {draft.kind === "weekly" ? (
            <div
              role="group"
              aria-label={t({ en: "On these days", zh: "在这几天" })}
              css={cluster.tight}
            >
              {WEEKDAYS.map((day) => (
                <Chip
                  key={day}
                  type="button"
                  isActive={draft.weekdays.includes(day)}
                  onClick={() => {
                    const weekdays = draft.weekdays.includes(day)
                      ? draft.weekdays.filter((chosen) => chosen !== day)
                      : [...draft.weekdays, day].toSorted((a, b) => a - b);
                    if (weekdays.length > 0) onChange({ ...draft, weekdays });
                  }}
                >
                  {formatShortWeekday(day, locale)}
                </Chip>
              ))}
            </div>
          ) : null}
          {draft.kind === "monthly" &&
          Number(draft.monthDay) >= SHORT_MONTH_DAY ? (
            <Text as="p" look="caption" tone="muted">
              {shortMonths}
            </Text>
          ) : null}
          {draft.kind === "yearly" ? (
            <Text as="p" look="caption" tone="muted">
              {onDate.replace(
                "{date}",
                formatShortDate(`2024-${draft.yearDate}`, locale),
              )}
            </Text>
          ) : null}
        </>
      )}
    </div>
  );
}

const styles = stylex.create({
  field: {
    inlineSize: "11rem",
  },
});
