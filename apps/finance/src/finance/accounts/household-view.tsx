"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import {
  StackedOnly,
  UnlessStacked,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight, rhythm } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { selectQueueCounts } from "../transactions/select-queue-counts.ts";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { HouseholdCards } from "./household-cards.tsx";
import { householdLayout } from "./household-layout.stylex.ts";
import { useSetNetWorthPick } from "./net-worth-pick-provider.tsx";
import {
  bankDifferenceLines,
  hasAccounts,
  NetWorthActions,
  NoAccounts,
  PickedHeadline,
} from "./net-worth-sidebar.tsx";
import {
  HOUSEHOLD_TREND,
  NetWorthTrend,
  useNetWorthRange,
} from "./net-worth-trend.tsx";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

interface HouseholdViewProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
  url: NetWorthUrl;
  onCreateAccount: () => void;
}

const STACKED_TREND_HEIGHT = 200;

/**
 * The Household in the content column of Net worth: the trend of its net
 * worth with the range to show, what needs a look, and the accounts that
 * moved most this week. The trend fills the height of the column that the
 * rest leaves. Where the column is wide, the two cards make a column beside
 * the trend, and "What moved this week" lists as many accounts as fit beside
 * it. Elsewhere the cards go under the trend, each as tall as its content, and
 * "Needs a look" takes the narrower part. Where the column fills a stack, as
 * on a phone, the Household is a page over the list of accounts: today's net
 * worth, the trend at full width with the range under it, then the cards.
 */
export function HouseholdView({
  sheet,
  today,
  currency,
  url,
  onCreateAccount,
}: HouseholdViewProps) {
  const setPick = useSetNetWorthPick();
  const [range, setRange] = useNetWorthRange();
  const trendRef = useSplitViewShared(HOUSEHOLD_TREND);
  const queue = useReplica(selectQueueCounts);

  useEffect(
    () => () => {
      setPick(null);
    },
    [setPick],
  );

  if (!hasAccounts(sheet)) {
    return <NoAccounts onCreateAccount={onCreateAccount} />;
  }

  const differences = bankDifferenceLines(sheet);
  const cards = (
    <HouseholdCards
      differences={differences}
      queue={queue}
      today={today}
      currency={currency}
      url={url}
    />
  );

  return (
    <div css={[stack.group, styles.view]}>
      <StackedOnly>
        <section css={stack.item} aria-label={t({ en: "Trend", zh: "趋势" })}>
          <Heading level={1} look="h3">
            {t({ en: "Household", zh: "家庭" })}
          </Heading>
          <PickedHeadline
            sheet={sheet}
            today={today}
            currency={currency}
            form="page"
          />
          <NetWorthTrend
            range={range}
            height={STACKED_TREND_HEIGHT}
            onPick={setPick}
            bleeds
          />
          <ChartRangeChips value={range} onChange={setRange} />
        </section>
      </StackedOnly>
      <div css={householdLayout.body}>
        <UnlessStacked>
          <section
            css={[stack.item, styles.trendSection]}
            aria-label={t({ en: "Trend", zh: "趋势" })}
          >
            <div css={[styles.titleRow, styles.firstLine]}>
              <Heading level={1} look="h3">
                {t({ en: "Household", zh: "家庭" })}
              </Heading>
              <div css={styles.actions}>
                <NetWorthActions
                  updateHref={url.modeHref("update")}
                  onCreateAccount={onCreateAccount}
                />
              </div>
            </div>
            <div css={styles.titleRow}>
              <PickedHeadline
                sheet={sheet}
                today={today}
                currency={currency}
                form="page"
              />
              <div css={styles.ranges}>
                <ChartRangeChips value={range} onChange={setRange} />
              </div>
            </div>
            <Card padding="sm" css={styles.chartCard}>
              <div ref={trendRef} css={styles.trend}>
                <NetWorthTrend
                  range={range}
                  height="fill"
                  onPick={setPick}
                  shared={HOUSEHOLD_TREND}
                />
              </div>
            </Card>
          </section>
        </UnlessStacked>
        {cards}
      </div>
    </div>
  );
}

const styles = stylex.create({
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    columnGap: rhythm.group,
    rowGap: rhythm.tight,
  },
  firstLine: {
    alignItems: "center",
  },
  // The actions overhang the line of the title, so that the title is on the
  // first line of the column, as the title of each other screen is.
  actions: {
    marginBlock: `calc((1lh - ${controlHeight.sm}) / 2)`,
  },
  // Beside the title where the column is wide enough, and a row of its own
  // under it where it is not.
  ranges: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: "18rem",
    maxInlineSize: "24rem",
  },
  view: {
    flexGrow: 1,
    containerType: "inline-size",
  },
  trendSection: {
    flexGrow: 1,
    flexBasis: 0,
    minInlineSize: 0,
  },
  chartCard: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: { default: "15rem", [breakpoints.md]: "18.75rem" },
  },
  trend: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
  },
});
