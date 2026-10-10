"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type {
  AnalyticsState,
  AnalyticsView,
} from "./compute-analytics-view.ts";
import { formatPercent } from "./format-percent.ts";
import { useScopeLabel } from "./use-scope-label.ts";

function formatRange(from: string, to: string, locale: string) {
  return from === to
    ? displayDay(from, locale, "dayYear")
    : `${displayDay(from, locale, "dayYear")} – ${displayDay(to, locale, "dayYear")}`;
}

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
  const signed = state.kind === "net";
  const money = (minor: number) =>
    formatMoney(Math.round(minor), currency, locale, {
      signDisplay: signed ? "exceptZero" : "auto",
    });
  const average = view.periodAverage;
  const change =
    view.previousTotal === null ? null : view.total - view.previousTotal;
  const percent =
    change === null || !view.previousTotal
      ? null
      : formatPercent(change / Math.abs(view.previousTotal), locale, true);
  const previous = view.range.previous;

  return (
    <section css={stack.tight} aria-label={heading}>
      <Text look="caption" tone="muted">
        {[heading, scope, formatRange(view.range.from, view.range.to, locale)]
          .filter((part) => part !== null)
          .join(" · ")}
      </Text>
      <span css={[typeRole.h1, styles.total]}>{money(view.total)}</span>
      {change === null || previous === null ? null : (
        <p css={[cluster.tight, typeRole.bodySmall, styles.line]}>
          {change === 0 ? (
            <span css={styles.muted}>{sameAsBefore}</span>
          ) : (
            <span css={[typeModifier.numeric, styles.change]}>
              {formatMoney(Math.round(change), currency, locale, {
                signDisplay: "exceptZero",
              })}
              {percent === null ? "" : ` (${percent})`}
            </span>
          )}
          <span css={styles.muted}>
            {change === 0 ? "" : `${versus} `}
            {formatRange(previous.from, previous.to, locale)}
          </span>
        </p>
      )}
      <p
        css={[
          typeRole.caption,
          typeModifier.numeric,
          styles.line,
          styles.muted,
        ]}
      >
        {`${view.count.toLocaleString(locale)} ${transactionsLabel} · ${
          locale === "zh"
            ? `${perPeriod} ${money(average)}`
            : `${money(average)} ${perPeriod}`
        }`}
      </p>
    </section>
  );
}

const styles = stylex.create({
  total: {
    fontWeight: font.weight_7,
  },
  line: {
    margin: 0,
  },
  change: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  muted: {
    color: color.fgMuted,
  },
});
