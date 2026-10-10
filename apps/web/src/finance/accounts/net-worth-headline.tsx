"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { selectNetWorthAt } from "../store/select-net-worth-at.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { formatPercentChange } from "./format-percent-change.ts";
import { netWorthComparisonDays } from "./net-worth-comparison-days.ts";

interface NetWorthHeadlineProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
}

/**
 * Today's net worth, its change since a week ago and since 1 January, and
 * the assets and liabilities it is made of.
 */
export function NetWorthHeadline({
  sheet,
  today,
  currency,
}: NetWorthHeadlineProps) {
  const locale = useLocale();
  const days = netWorthComparisonDays(today);
  const lastWeek = useReplica((snapshot) =>
    selectNetWorthAt(snapshot, days.lastWeek),
  );
  const yearStart = useReplica((snapshot) =>
    selectNetWorthAt(snapshot, days.yearStart),
  );
  const money = (minor: number) => formatMoney(minor, currency, locale);
  const changes = [
    {
      key: "week",
      from: lastWeek,
      label: t({ en: "vs last week", zh: "较上周" }),
    },
    {
      key: "year",
      from: yearStart,
      label: t({ en: "since 1 Jan", zh: "今年以来" }),
    },
  ];

  return (
    <section
      css={stack.item}
      aria-label={t({ en: "Net worth today", zh: "今日净资产" })}
    >
      <div css={stack.tight}>
        <Text look="caption" tone="muted">
          {t({ en: "Net worth today", zh: "今日净资产" })}
        </Text>
        <span css={[typeRole.h1, typeModifier.numeric, styles.headline]}>
          {money(sheet.netWorth)}
        </span>
        <dl css={[cluster.item, styles.changes]}>
          {changes.map(({ key, from, label }) => {
            const change = sheet.netWorth - from;
            const percent = formatPercentChange(change, from, locale);
            return (
              <div key={key} css={[cluster.tight, typeRole.bodySmall]}>
                <dt css={styles.muted}>{label}</dt>
                <dd
                  css={[
                    typeModifier.numeric,
                    styles.delta,
                    change > 0 && styles.up,
                    change < 0 && styles.down,
                  ]}
                >
                  {formatMoney(change, currency, locale, {
                    signDisplay: "exceptZero",
                  })}
                  {percent === null ? "" : ` (${percent})`}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      <dl css={[cluster.item, styles.sides]}>
        <div css={styles.side}>
          <dt css={[typeRole.caption, styles.muted]}>
            {t({ en: "Assets", zh: "资产" })}
          </dt>
          <dd css={[typeRole.body, typeModifier.numeric, styles.sideValue]}>
            {money(sheet.assets)}
          </dd>
        </div>
        <div css={styles.side}>
          <dt css={[typeRole.caption, styles.muted]}>
            {t({ en: "Liabilities", zh: "负债" })}
          </dt>
          <dd css={[typeRole.body, typeModifier.numeric, styles.sideValue]}>
            {money(sheet.liabilities)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

const styles = stylex.create({
  headline: {
    fontWeight: font.weight_7,
  },
  changes: {
    margin: 0,
    rowGap: rhythm.tight,
  },
  delta: {
    margin: 0,
    order: -1,
    fontWeight: font.weight_6,
    color: color.fg,
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
  sides: {
    margin: 0,
  },
  side: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  sideValue: {
    margin: 0,
    fontWeight: font.weight_6,
  },
});
