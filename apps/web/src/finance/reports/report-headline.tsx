"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
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
    <section
      css={stack.tight}
      aria-label={t({ en: "Net worth", zh: "净资产" })}
    >
      <Text look="caption" tone="muted">
        {t({ en: "Net worth at the end of the week", zh: "本周末净资产" })}
      </Text>
      <span css={[typeRole.h1, typeModifier.numeric, styles.headline]}>
        {formatMoney(data.balanceSheet.netWorthMinor, currency, locale)}
      </span>
      <dl css={[cluster.item, styles.changes]}>
        {changes.map(({ key, label, comparison }) => (
          <div key={key} css={[cluster.tight, typeRole.bodySmall]}>
            <dt css={styles.label}>{label}</dt>
            <dd css={styles.value}>
              <MoneyChange
                changeMinor={comparison.changeMinor}
                fromMinor={comparison.netWorthMinor}
                currency={currency}
                tone
              />
            </dd>
          </div>
        ))}
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
    rowGap: rhythm.inline,
  },
  label: {
    color: color.fgMuted,
  },
  value: {
    margin: 0,
    order: -1,
  },
});
