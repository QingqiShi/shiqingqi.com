"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import type { ChartPick } from "../charts/time-series-chart.tsx";
import { displayDay, displayDayRange } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercentChange } from "../domain/money/format-percent-change.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { selectNetWorthAt } from "../store/select-net-worth-at.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { netWorthComparisonDays } from "./net-worth-comparison-days.ts";

export type NetWorthHeadlineForm = "label" | "page";

interface NetWorthHeadlineProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
  /** What is picked on the trend chart, shown in place of today's figure. */
  pick: ChartPick | null;
  /**
   * `"label"` names the Household in a label over the figure. `"page"`,
   * under a title that names the page, shows no label and adds the assets
   * and liabilities under the changes.
   */
  form?: NetWorthHeadlineForm;
}

/**
 * Today's net worth of the Household and its change since a week ago and
 * since 1 January, in whole currency units. While a day or a range is
 * picked on a trend chart, the figure and the line under it show the pick
 * instead.
 */
export function NetWorthHeadline({
  sheet,
  today,
  currency,
  pick,
  form = "label",
}: NetWorthHeadlineProps) {
  const locale = useLocale();
  const money = (minor: number, signed = false) =>
    formatMoney(minor, currency, locale, {
      wholeUnits: true,
      signDisplay: signed ? "exceptZero" : "auto",
    });

  return (
    <section
      css={stack.tight}
      aria-label={t({ en: "Net worth today", zh: "今日净资产" })}
    >
      {form === "label" ? (
        <h1 css={[typeRole.label, styles.label]}>
          {t({ en: "Net worth · household", zh: "净资产 · 家庭" })}
        </h1>
      ) : null}
      <span css={[typeRole.h1, typeModifier.numeric, styles.figure]}>
        {pick === null
          ? money(sheet.netWorth)
          : pick.kind === "point"
            ? money(pick.value)
            : money(pick.to - pick.from, true)}
      </span>
      <div css={stack.text}>
        <div css={styles.layers}>
          <TodayChanges
            netWorth={sheet.netWorth}
            today={today}
            currency={currency}
            hidden={pick !== null}
          />
          {pick === null ? null : (
            <span
              aria-hidden
              css={[row.tight, typeRole.bodySmall, styles.layer, styles.muted]}
            >
              {pick.kind === "point" ? (
                displayDay(pick.day, locale, "dayYear")
              ) : (
                <>
                  <span
                    css={[
                      typeModifier.numeric,
                      styles.value,
                      pick.to > pick.from && styles.up,
                      pick.to < pick.from && styles.down,
                    ]}
                  >
                    {formatPercentChange(
                      pick.to - pick.from,
                      pick.from,
                      locale,
                      {
                        short: true,
                      },
                    )}
                  </span>
                  <span>
                    {displayDayRange(pick.startDay, pick.endDay, locale)}
                  </span>
                </>
              )}
            </span>
          )}
        </div>
        {form === "page" ? (
          <dl css={[cluster.item, typeRole.bodySmall, styles.facts]}>
            <Fact label={t({ en: "Assets", zh: "资产" })}>
              {money(sheet.assets)}
            </Fact>
            <Fact label={t({ en: "Liabilities", zh: "负债" })}>
              {money(sheet.liabilities)}
            </Fact>
          </dl>
        ) : null}
      </div>
    </section>
  );
}

/**
 * Today's change since a week ago and since 1 January. A component of its
 * own, so that a pick on the chart does not read the two past net worths
 * again.
 */
function TodayChanges({
  netWorth,
  today,
  currency,
  hidden,
}: {
  netWorth: number;
  today: string;
  currency: string;
  hidden: boolean;
}) {
  const days = netWorthComparisonDays(today);
  const lastWeek = useReplica((snapshot) =>
    selectNetWorthAt(snapshot, days.lastWeek),
  );
  const yearStart = useReplica((snapshot) =>
    selectNetWorthAt(snapshot, days.yearStart),
  );
  const changes = [
    { from: lastWeek, label: t({ en: "1W", zh: "近一周" }) },
    { from: yearStart, label: t({ en: "YTD", zh: "今年" }) },
  ];
  return (
    <dl
      css={[
        cluster.item,
        typeRole.bodySmall,
        styles.facts,
        styles.layer,
        hidden && styles.hidden,
      ]}
    >
      {changes.map(({ from, label }) => (
        <Fact key={label} label={label}>
          <MoneyChange
            changeMinor={netWorth - from}
            fromMinor={from}
            currency={currency}
            tone
            whole
          />
        </Fact>
      ))}
    </dl>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div css={row.inline}>
      <dt css={styles.muted}>{label}</dt>
      <dd css={[typeModifier.numeric, styles.value]}>{children}</dd>
    </div>
  );
}

const styles = stylex.create({
  // Today's changes and the pick's day share one cell, so that the block
  // keeps the height of the taller one and a pick moves nothing.
  layers: {
    display: "grid",
  },
  layer: {
    gridArea: "1 / 1",
    minInlineSize: 0,
  },
  hidden: {
    visibility: "hidden",
  },
  label: {
    margin: 0,
    color: color.fgMuted,
  },
  figure: {
    fontWeight: font.weight_7,
  },
  facts: {
    margin: 0,
    rowGap: 0,
  },
  value: {
    margin: 0,
    fontWeight: font.weight_6,
  },
  up: {
    color: color.fgSuccess,
  },
  down: {
    color: color.fgDanger,
  },
  muted: {
    color: color.fgMuted,
  },
});
