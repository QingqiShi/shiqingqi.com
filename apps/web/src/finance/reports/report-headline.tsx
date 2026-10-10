"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { ReportChange } from "./report-change.tsx";
import type { WeeklyReportData } from "./weekly-report-data-schema.ts";

/** Net worth at the end of the week, and how it moved over one week, four weeks and the year. */
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
    <section css={stack.item} aria-label={t({ en: "Net worth", zh: "净资产" })}>
      <div css={stack.tight}>
        <Text look="caption" tone="muted">
          {t({ en: "Net worth at the end of the week", zh: "本周末净资产" })}
        </Text>
        <span css={[typeRole.h1, typeModifier.numeric, styles.headline]}>
          {formatMoney(data.balanceSheet.netWorthMinor, currency, locale)}
        </span>
      </div>
      <dl css={styles.changes}>
        {changes.map(({ key, label, comparison }) => (
          <div key={key} css={styles.change}>
            <dt css={[typeRole.caption, styles.muted]}>{label}</dt>
            <dd css={[typeRole.bodySmall, styles.value]}>
              <ReportChange
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
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
    },
    gap: rhythm.tight,
    margin: 0,
  },
  change: {
    display: "flex",
    flexDirection: { default: "row", [breakpoints.md]: "column" },
    justifyContent: { default: "space-between", [breakpoints.md]: "start" },
    alignItems: { default: "baseline", [breakpoints.md]: "start" },
  },
  muted: {
    color: color.fgMuted,
  },
  value: {
    margin: 0,
  },
});
