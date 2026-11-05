"use client";

import { CaretLeftIcon } from "@phosphor-icons/react/dist/ssr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, rhythm, space } from "@tuja/ui/tokens.stylex";
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
          <h1 ref={titleRef} css={[typeRole.h1, styles.heading]}>
            {monthName(view.month)}
          </h1>
          <span css={[typeRole.caption, typeModifier.numeric, styles.muted]}>
            {`${view.count.toLocaleString(locale)} ${transactionsLabel}`}
          </span>
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
            css={corner.radius_round}
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
            css={corner.radius_round}
            onClick={() => {
              onMonth(next);
            }}
          />
        </nav>
      </div>
      <dl css={styles.figures}>
        <div css={stack.text}>
          <dt css={[typeRole.label, styles.muted]}>
            {t({ en: "Money in", zh: "收入" })}
          </dt>
          <dd css={[typeRole.fluidH1, typeModifier.numeric, styles.figure]}>
            <RollingFigure
              value={view.moneyIn}
              format={money}
              css={styles.in}
            />
          </dd>
        </div>
        <div css={stack.text}>
          <dt css={[typeRole.label, styles.muted]}>
            {t({ en: "Money out", zh: "支出" })}
          </dt>
          <dd css={[typeRole.fluidH1, typeModifier.numeric, styles.figure]}>
            <RollingFigure
              value={-view.moneyOut}
              format={money}
              css={styles.out}
            />
          </dd>
        </div>
        <div css={stack.text}>
          <dt css={[typeRole.label, styles.muted]}>
            {isPositive
              ? t({ en: "Left over", zh: "结余" })
              : t({ en: "Overspent", zh: "超支" })}
          </dt>
          <dd css={[typeRole.fluidH1, typeModifier.numeric, styles.figure]}>
            <RollingFigure
              value={view.net}
              format={money}
              css={[
                corner.radius_round,
                transition.colors,
                styles.pill,
                isPositive ? styles.pillUp : styles.pillDown,
              ]}
            />
          </dd>
        </div>
      </dl>
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
  heading: {
    margin: 0,
    fontWeight: font.weight_7,
  },
  muted: {
    color: color.fgMuted,
  },
  figures: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    columnGap: { default: rhythm.item, [breakpoints.md]: rhythm.group },
    rowGap: rhythm.item,
    margin: 0,
  },
  figure: {
    margin: 0,
    fontWeight: font.weight_7,
    whiteSpace: "nowrap",
  },
  in: {
    color: color.fgSuccess,
  },
  out: {
    color: color.fgDanger,
  },
  pill: {
    display: "inline-block",
    paddingBlock: space._00,
    paddingInline: space._2,
  },
  pillUp: {
    backgroundColor: color.bgSuccess,
    color: color.fgOnSuccess,
  },
  pillDown: {
    backgroundColor: color.bgDanger,
    color: color.fgOnDanger,
  },
});
