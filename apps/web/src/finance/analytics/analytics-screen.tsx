"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useReplica } from "../replica/use-replica.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { AnalyticsControls } from "./analytics-controls.tsx";
import { AnalyticsSummary } from "./analytics-summary.tsx";
import { CategoryBreakdown } from "./category-breakdown.tsx";
import { CategoryTrend } from "./category-trend.tsx";
import { IncomeSpendingChart } from "./income-spending-chart.tsx";
import { RankedBreakdown } from "./ranked-breakdown.tsx";
import { useAnalyticsNames } from "./use-analytics-names.ts";
import { useAnalyticsState } from "./use-analytics-state.ts";
import { useAnalyticsView } from "./use-analytics-view.ts";

function AnalyticsContent() {
  const [state, update] = useAnalyticsState();
  const { view, index } = useAnalyticsView(state);
  const currency = useBaseCurrency();
  const members = useReplica(liveRowSelectors.members);
  const names = useAnalyticsNames();

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

  return (
    <>
      <AnalyticsControls
        state={state}
        view={view}
        members={members}
        onChange={update}
      />
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
          <RankedBreakdown
            heading={t({ en: "Top payees", zh: "主要商家" })}
            empty={t({
              en: "No payees in this range.",
              zh: "这段时间没有商家记录。",
            })}
            list="ol"
            items={view.payees.map((item) => ({
              key: item.payeeId,
              label: names.payee(item.payeeId),
              value: item.value,
              filter: { payeeId: item.payeeId },
            }))}
            state={state}
            view={view}
            currency={currency}
          />
          <RankedBreakdown
            heading={t({ en: "By tag", zh: "按标签" })}
            empty={t({
              en: "No tagged transactions in this range.",
              zh: "这段时间没有带标签的交易。",
            })}
            list="ul"
            items={view.tags.map((item) => ({
              key: item.tagId,
              label: `#${names.tag(item.tagId)}`,
              value: item.value,
              filter: { tagId: item.tagId },
            }))}
            state={state}
            view={view}
            currency={currency}
          />
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
