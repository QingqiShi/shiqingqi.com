"use client";

import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { MetaLine } from "@tuja/ui/components/meta-line";
import { Stat } from "@tuja/ui/components/stat";
import { Text } from "@tuja/ui/components/text";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { displayDayRange } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { formatPercent } from "../domain/money/format-percent.ts";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import { formatAnalyticsMoney } from "./format-analytics-money.ts";
import { useScopeLabel } from "./use-scope-label.ts";

/** The range's total, the change on the period before, and the count and average behind it. */
export function AnalyticsSummary({
  state,
  view,
  currency,
}: {
  state: AnalyticsState;
  view: AnalyticsView;
  currency: string;
}) {
  const locale = useLocale();
  const scope = useScopeLabel(view);
  const heading = {
    spending: t({ en: "Spent", zh: "支出" }),
    income: t({ en: "Earned", zh: "收入" }),
    net: t({ en: "Earned minus spent", zh: "收入减支出" }),
  }[state.kind];
  const perPeriod = {
    day: t({ en: "a day on average", zh: "日均" }),
    week: t({ en: "a week on average", zh: "周均" }),
    month: t({ en: "a month on average", zh: "月均" }),
    year: t({ en: "a year on average", zh: "年均" }),
  }[view.grouping];
  const transactionsLabel = t({ en: "transactions", zh: "笔交易" });
  const versus = t({ en: "vs", zh: "对比" });
  const sameAsBefore = t({ en: "Same as", zh: "持平，对比" });
  const money = (minor: number) =>
    formatAnalyticsMoney(minor, currency, locale, state.kind);
  const average = view.periodAverage;
  const change =
    view.previousTotal === null ? null : view.total - view.previousTotal;
  const percent =
    change === null || !view.previousTotal
      ? null
      : formatPercent(change / Math.abs(view.previousTotal), locale, true);
  const previous = view.range.previous;

  return (
    <section aria-label={heading}>
      <Stat
        label={
          <MetaLine
            facts={[
              heading,
              scope,
              displayDayRange(view.range.from, view.range.to, locale),
            ]}
          />
        }
        value={money(view.total)}
        detail={
          <>
            {change === null || previous === null ? null : (
              <div css={cluster.tight}>
                {change === 0 ? (
                  <Text as="span" look="caption" tone="muted">
                    {sameAsBefore}
                  </Text>
                ) : (
                  <Text as="span" look="caption" weight="semibold" numeric>
                    {formatMoney(Math.round(change), currency, locale, {
                      signDisplay: "exceptZero",
                    })}
                    {percent === null ? "" : ` (${percent})`}
                  </Text>
                )}
                <Text as="span" look="caption" tone="muted">
                  {change === 0 ? "" : `${versus} `}
                  {displayDayRange(previous.from, previous.to, locale)}
                </Text>
              </div>
            )}
            <Text as="div" look="caption" tone="muted" numeric>
              {`${view.count.toLocaleString(locale)} ${transactionsLabel} · ${
                locale === "zh"
                  ? `${perPeriod} ${money(average)}`
                  : `${money(average)} ${perPeriod}`
              }`}
            </Text>
          </>
        }
      />
    </section>
  );
}
