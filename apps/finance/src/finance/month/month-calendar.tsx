"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useRef } from "react";
import { categoryIdOf } from "../analytics/category-id-of.ts";
import type { AnalyticsIndex } from "../analytics/types.ts";
import { useAnalyticsNames } from "../analytics/use-analytics-names.ts";
import { displayDay, displayWeekday } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { MonthDay, MonthView } from "./build-month-view.ts";
import { useMonthSlide } from "./use-month-slide.ts";
import { wholeMoney } from "./whole-money.ts";

interface MonthCalendarProps {
  view: MonthView;
  index: AnalyticsIndex;
  currency: string;
  /** Today as an epoch day. */
  today: number;
  pickedDay: number | null;
  onPickDay: (epochDay: number) => void;
}

const MAX_CHIPS = 3;
const MAX_DOTS = 3;
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * The month as a calendar of weeks from Monday. Each day shows its
 * everyday spending in its corner and its notable Transactions as chips;
 * where the calendar is narrow, the chips become dots. A press anywhere on
 * a day opens its Transactions under the calendar.
 */
export function MonthCalendar({
  view,
  index,
  currency,
  today,
  pickedDay,
  onPickDay,
}: MonthCalendarProps) {
  const locale = useLocale();
  const names = useAnalyticsNames();
  const gridRef = useRef<HTMLDivElement>(null);
  useMonthSlide(gridRef, view.month, 32);
  const income = t({ en: "Income", zh: "收入" });
  const expense = t({ en: "Expense", zh: "支出" });
  const spentLabel = t({ en: "spent", zh: "日常支出" });
  const moreLabel = t({ en: "more", zh: "更多" });
  const todayLabel = t({ en: "today", zh: "今天" });

  const whole = (minor: number) => wholeMoney(minor, currency, locale);
  const nameOf = (row: number) => {
    const payee = index.payees[row];
    if (payee >= 0) return names.payee(index.payeeIds[payee]);
    const categoryId = categoryIdOf(index, index.categories[row]);
    if (categoryId !== null) return names.category(categoryId).name;
    return index.kinds[row] === 1 ? income : expense;
  };

  const cell = (day: MonthDay) => {
    const isToday = day.epochDay === today;
    const isPicked = day.epochDay === pickedDay;
    const extra = day.notable.length - MAX_CHIPS;
    const label = [
      displayDay(day.epochDay, locale, "weekday"),
      isToday ? todayLabel : null,
      day.everyday === 0 ? null : `${whole(day.everyday)} ${spentLabel}`,
      ...day.notable.map(
        (row) => `${nameOf(row)} ${whole(index.amounts[row])}`,
      ),
    ]
      .filter((part) => part !== null)
      .join(", ");
    return (
      <div key={day.epochDay} css={styles.cell}>
        <button
          type="button"
          aria-pressed={isPicked}
          aria-label={label}
          onClick={() => {
            onPickDay(day.epochDay);
          }}
          css={[
            buttonReset.base,
            corner.radius_2,
            quietSurface.interactive,
            styles.press,
          ]}
        />
        <div css={styles.content}>
          <div css={styles.top}>
            <span
              css={[
                typeRole.caption,
                typeModifier.numeric,
                corner.radius_round,
                styles.number,
                isToday && styles.today,
              ]}
            >
              {day.dayOfMonth}
            </span>
            {day.everyday === 0 ? null : (
              <span
                css={[typeRole.caption, typeModifier.numeric, styles.everyday]}
              >
                <span css={styles.wide}>{whole(day.everyday)}</span>
                <span css={styles.narrow}>
                  {formatMoney(Math.round(day.everyday), currency, locale, {
                    signDisplay: "exceptZero",
                    compact: true,
                  })}
                </span>
              </span>
            )}
          </div>
          <div css={[styles.chips, styles.wideFlex]} aria-hidden>
            {day.notable.slice(0, MAX_CHIPS).map((row) => (
              <Badge
                key={row}
                size="sm"
                intent={index.amounts[row] > 0 ? "success" : "destructive"}
                css={[corner.radius_1, styles.chip]}
              >
                <span css={[truncate.base, styles.chipName]}>
                  {nameOf(row)}
                </span>
                <span css={[typeModifier.numeric, styles.chipAmount]}>
                  {whole(index.amounts[row])}
                </span>
              </Badge>
            ))}
            {extra > 0 ? (
              <span css={[typeRole.caption, styles.more]}>
                {`+${String(extra)} ${moreLabel}`}
              </span>
            ) : null}
          </div>
          <div css={[styles.dots, styles.narrowFlex]} aria-hidden>
            {day.notable.slice(0, MAX_DOTS).map((row) => (
              <span
                key={row}
                css={[
                  corner.radius_round,
                  styles.dot,
                  index.amounts[row] > 0 ? styles.dotIn : styles.dotOut,
                ]}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div css={styles.calendar}>
      <div css={styles.week} aria-hidden>
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} css={[typeRole.caption, styles.weekday]}>
            {displayWeekday(weekday, locale)}
          </span>
        ))}
      </div>
      <div ref={gridRef} css={styles.grid}>
        {Array.from({ length: view.leadingBlanks }, (_, at) => (
          <div key={`blank-${String(at)}`} css={styles.blank} />
        ))}
        {view.days.map(cell)}
      </div>
    </div>
  );
}

const WIDE = "@container (min-width: 40rem)";

const styles = stylex.create({
  calendar: {
    containerType: "inline-size",
  },
  week: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
    paddingBlockEnd: space._1,
  },
  weekday: {
    justifySelf: { default: "center", [WIDE]: "start" },
    minInlineSize: "1.6rem",
    paddingInlineStart: { default: 0, [WIDE]: space._0 },
    color: color.mutedForeground,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
  },
  blank: {
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  cell: {
    position: "relative",
    minInlineSize: 0,
    minBlockSize: { default: "3.5rem", [WIDE]: "6.75rem" },
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
  },
  press: {
    position: "absolute",
    inset: space._00,
  },
  content: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: rhythm.inline,
    paddingBlock: { default: space._0, [WIDE]: space._1 },
    paddingInline: space._0,
    pointerEvents: "none",
  },
  top: {
    display: "flex",
    flexDirection: { default: "column", [WIDE]: "row" },
    alignItems: { default: "center", [WIDE]: "flex-start" },
    justifyContent: "space-between",
    gap: rhythm.inline,
  },
  number: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minInlineSize: "1.6rem",
    blockSize: "1.6rem",
    fontWeight: font.weight_6,
  },
  today: {
    backgroundColor: color.primary,
    color: color.primaryForeground,
  },
  everyday: {
    color: color.mutedForeground,
    paddingBlockStart: { default: 0, [WIDE]: space._0 },
    whiteSpace: "nowrap",
  },
  wide: {
    display: { default: "none", [WIDE]: "inline" },
  },
  narrow: {
    display: { default: "inline", [WIDE]: "none" },
  },
  wideFlex: {
    display: { default: "none", [WIDE]: "flex" },
  },
  narrowFlex: {
    display: { default: "flex", [WIDE]: "none" },
  },
  chips: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: rhythm.inline,
    minInlineSize: 0,
  },
  chip: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    columnGap: rhythm.inline,
    textAlign: "start",
    maxInlineSize: "100%",
    minInlineSize: 0,
  },
  chipName: {
    minInlineSize: 0,
  },
  chipAmount: {
    flexShrink: 0,
  },
  more: {
    color: color.mutedForeground,
    paddingInline: space._1,
  },
  dots: {
    justifyContent: "center",
    gap: rhythm.inline,
  },
  dot: {
    inlineSize: "6px",
    blockSize: "6px",
  },
  dotIn: {
    backgroundColor: color.success,
  },
  dotOut: {
    backgroundColor: color.destructive,
  },
});
