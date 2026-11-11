"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Stat } from "@tuja/ui/components/stat";
import { StatGroup } from "@tuja/ui/components/stat-group";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useRef } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import type { MonthView } from "./build-month-view.ts";
import {
  addMonthKey,
  type MonthBounds,
  type MonthKey,
} from "./month-bounds.ts";
import { RollingFigure } from "./rolling-figure.tsx";
import { useMonthSlide } from "./use-month-slide.ts";
import { wholeMoney } from "./whole-money.ts";

interface MonthSummaryProps {
  view: MonthView;
  bounds: MonthBounds;
  currency: string;
  onMonth: (month: MonthKey) => void;
}

/** The month's name with the steps to the months either side, then money in, money out and what is left. */
export function MonthSummary({
  view,
  bounds,
  currency,
  onMonth,
}: MonthSummaryProps) {
  const locale = useLocale();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useMonthSlide(titleRef, view.month, 12);
  const money = (minor: number) => wholeMoney(minor, currency, locale);
  const monthName = (month: MonthKey) =>
    displayDay(`${month}-01`, locale, "longMonthYear");
  const previous = addMonthKey(view.month, -1);
  const next = addMonthKey(view.month, 1);
  const hasPrevious = view.month !== bounds.first;
  const hasNext = view.month !== bounds.last;
  const colon = t({ en: ": ", zh: "：" });
  const previousLabel = t({ en: "Previous month", zh: "上个月" });
  const nextLabel = t({ en: "Next month", zh: "下个月" });
  const transactionsLabel =
    view.count === 1
      ? t({ en: "transaction", zh: "笔交易" })
      : t({ en: "transactions", zh: "笔交易" });
  const isPositive = view.net >= 0;

  return (
    <header css={stack.item}>
      <div css={styles.titleRow}>
        <div css={[stack.tight, styles.title]}>
          <Heading level={1} look="h1" weight="bold" ref={titleRef}>
            {monthName(view.month)}
          </Heading>
          <Text as="span" look="caption" tone="muted" numeric>
            {`${view.count.toLocaleString(locale)} ${transactionsLabel}`}
          </Text>
        </div>
        <nav
          aria-label={t({ en: "Months", zh: "按月浏览" })}
          css={cluster.tight}
        >
          <Button
            icon={<CaretLeftIcon weight="bold" />}
            aria-label={
              hasPrevious
                ? `${previousLabel}${colon}${monthName(previous)}`
                : previousLabel
            }
            disabled={!hasPrevious}
            onClick={() => {
              onMonth(previous);
            }}
          />
          <Button
            icon={<CaretRightIcon weight="bold" />}
            aria-label={
              hasNext ? `${nextLabel}${colon}${monthName(next)}` : nextLabel
            }
            disabled={!hasNext}
            onClick={() => {
              onMonth(next);
            }}
          />
        </nav>
      </div>
      <StatGroup look="plain">
        <Stat
          label={t({ en: "Money in", zh: "收入" })}
          value={<RollingFigure value={view.moneyIn} format={money} />}
          intent="success"
        />
        <Stat
          label={t({ en: "Money out", zh: "支出" })}
          value={<RollingFigure value={-view.moneyOut} format={money} />}
          intent="destructive"
        />
        <Stat
          label={
            isPositive
              ? t({ en: "Left over", zh: "结余" })
              : t({ en: "Overspent", zh: "超支" })
          }
          value={<RollingFigure value={view.net} format={money} />}
          intent={isPositive ? "success" : "destructive"}
        />
      </StatGroup>
    </header>
  );
}

const styles = stylex.create({
  titleRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: rhythm.item,
  },
  title: {
    minInlineSize: 0,
  },
});
