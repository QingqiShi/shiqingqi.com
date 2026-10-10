"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { AnalyticsControls } from "./analytics-controls.tsx";
import { AnalyticsSummary } from "./analytics-summary.tsx";
import { CategoryBreakdown } from "./category-breakdown.tsx";
import { CategoryTrend } from "./category-trend.tsx";
import { IncomeSpendingChart } from "./income-spending-chart.tsx";
import { TagBreakdown } from "./tag-breakdown.tsx";
import { TopPayees } from "./top-payees.tsx";
import { useAnalyticsState } from "./use-analytics-state.ts";
import { useAnalyticsView } from "./use-analytics-view.ts";

function AnalyticsContent() {
  const locale = useLocale();
  const [state, update] = useAnalyticsState();
  const { view, index } = useAnalyticsView(state);
  const currency = useBaseCurrency();
  const members = useReplica(liveRowSelectors.members);

  if (index.length === 0) {
    return (
      <Text as="p" look="body" tone="muted">
        {t({
          en: "No spending or income yet. Add a transaction to see where the money goes.",
          zh: "还没有收支记录。添加一笔交易，看看钱花在了哪里。",
        })}
      </Text>
    );
  }

  const windowNote =
    view.beyondWindow && view.rawFrom !== null
      ? `${t({
          en: "Before",
          zh: "早于",
        })} ${displayDay(view.rawFrom, locale, "dayYear")}${t({
          en: ", this device keeps only monthly totals by category and member. Payees and tags count from that day.",
          zh: "的数据在本设备上只保留按分类和成员的月度汇总。商家和标签从这一天起才开始统计。",
        })}`
      : null;

  return (
    <>
      <AnalyticsControls
        state={state}
        view={view}
        members={members}
        onChange={update}
      />
      {windowNote ? (
        <Text as="p" look="caption" tone="muted">
          {windowNote}
        </Text>
      ) : null}
      <div css={styles.columns}>
        <div css={[stack.group, styles.column]}>
          <AnalyticsSummary state={state} view={view} currency={currency} />
          <CategoryBreakdown
            state={state}
            view={view}
            currency={currency}
            onChange={update}
          />
        </div>
        <div css={[stack.group, styles.column]}>
          {view.trend ? (
            <CategoryTrend
              trend={view.trend}
              state={state}
              view={view}
              index={index}
              currency={currency}
              onChange={update}
            />
          ) : null}
          <IncomeSpendingChart state={state} view={view} currency={currency} />
          <TopPayees state={state} view={view} currency={currency} />
          <TagBreakdown state={state} view={view} currency={currency} />
        </div>
      </div>
    </>
  );
}

/**
 * `/finance/analytics`: where the money went and came from over a range,
 * worked out on the device from the Replica, so a new range draws at once.
 */
export function AnalyticsScreen() {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);

  return (
    <div css={stack.group}>
      <Heading level={1} look="h3" css={styles.title}>
        {t({ en: "Analytics", zh: "分析" })}
      </Heading>
      {bootstrapped ? (
        <AnalyticsContent />
      ) : (
        <div css={stack.item} aria-busy>
          <Skeleton width="100%" height="2rem" />
          <Skeleton width="10rem" height="2.5rem" />
          <Skeleton width="100%" height="12rem" />
        </div>
      )}
    </div>
  );
}

const styles = stylex.create({
  title: {
    margin: 0,
  },
  columns: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "repeat(2, minmax(0, 1fr))",
    },
    columnGap: rhythm.section,
    rowGap: rhythm.group,
    alignItems: "start",
  },
  column: {
    minInlineSize: 0,
  },
});
