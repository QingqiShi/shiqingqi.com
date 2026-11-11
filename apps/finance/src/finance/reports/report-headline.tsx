"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Stat } from "@tuja/ui/components/stat";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { formatMoney } from "../domain/money/format-money.ts";
import { MoneyChange } from "../domain/money/money-change.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Net worth at the end of the week, and how it moved over the week, four weeks and the year. */
export function ReportHeadline({ data }: { data: WeeklyReportData }) {
  const locale = useLocale();
  const currency = data.baseCurrency;
  const { comparisons } = data;
  const changes = [
    {
      key: "week",
      label: t({ en: "vs last week", zh: "较上周" }),
      comparison: comparisons.previousWeek,
    },
    {
      key: "four-weeks",
      label: t({ en: "vs 4 weeks ago", zh: "较 4 周前" }),
      comparison: comparisons.fourWeeksAgo,
    },
    {
      key: "year",
      label: t({ en: "since 1 Jan", zh: "今年以来" }),
      comparison: comparisons.yearStart,
    },
  ];

  return (
    <section aria-label={t({ en: "Net worth", zh: "净资产" })}>
      <Stat
        label={t({
          en: "Net worth at the end of the week",
          zh: "本周末净资产",
        })}
        value={formatMoney(data.balanceSheet.netWorthMinor, currency, locale)}
        detail={
          <dl css={[cluster.item, styles.changes]}>
            {changes.map(({ key, label, comparison }) => (
              <div key={key} css={cluster.tight}>
                <Text as="dt" look="bodySmall" tone="muted">
                  {label}
                </Text>
                <Text as="dd" look="bodySmall" css={styles.value}>
                  <MoneyChange
                    changeMinor={comparison.changeMinor}
                    fromMinor={comparison.netWorthMinor}
                    currency={currency}
                    tone
                  />
                </Text>
              </div>
            ))}
          </dl>
        }
      />
    </section>
  );
}

const styles = stylex.create({
  changes: {
    margin: 0,
    rowGap: rhythm.inline,
  },
  value: {
    order: -1,
  },
});
