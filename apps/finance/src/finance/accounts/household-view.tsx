"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import {
  StackedOnly,
  UnlessFullSidebar,
  UnlessStacked,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { selectQueueCounts } from "../transactions/select-queue-counts.ts";
import { AccountGroupList } from "./account-group-list.tsx";
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
 * moved most this week. Where the sidebar does not show in full, today's
 * figures and the actions come first. The trend fills the height of the
 * column that the rest leaves. Where the column is wide, the two cards make
 * a column beside the trend, and "What moved this week" lists as many
 * accounts as fit beside it. Elsewhere the cards go under the trend, each
 * as tall as its content, and "Needs a look" takes the narrower part. Where
 * the column fills a stack, as on a phone, the page takes the title "Net
 * worth" with the actions beside it, then today's figures, the trend at full
 * width with the range under it, what needs a look when something does,
 * and the accounts by Group, because no sidebar shows them.
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
    return (
      <UnlessFullSidebar>
        <NoAccounts onCreateAccount={onCreateAccount} />
      </UnlessFullSidebar>
    );
  }

  const differences = bankDifferenceLines(sheet);
  const nothingNeedsALook =
    differences.length === 0 && queue.review === 0 && queue.expected === 0;
  const cards = (
    <HouseholdCards
      differences={differences}
      queue={queue}
      today={today}
      currency={currency}
      url={url}
    />
  );

  const actions = (
    <NetWorthActions
      updateHref={url.modeHref("update")}
      onCreateAccount={onCreateAccount}
      flush
    />
  );

  return (
    <div css={[stack.group, styles.view]}>
      <StackedOnly>
        <div css={stack.tight}>
          <header css={[cluster.item, styles.header]}>
            <Heading level={1} look="h3" css={styles.title}>
              {t({ en: "Net worth", zh: "净资产" })}
            </Heading>
            {actions}
          </header>
          <div css={stack.item}>
            <PickedHeadline
              sheet={sheet}
              today={today}
              currency={currency}
              form="page"
            />
            <section
              css={stack.item}
              aria-label={t({ en: "Trend", zh: "趋势" })}
            >
              <NetWorthTrend
                range={range}
                height={STACKED_TREND_HEIGHT}
                onPick={setPick}
                bleeds
              />
              <ChartRangeChips value={range} onChange={setRange} />
            </section>
          </div>
        </div>
      </StackedOnly>
      <UnlessStacked>
        <UnlessFullSidebar>
          <div css={stack.item}>
            <PickedHeadline sheet={sheet} today={today} currency={currency} />
            {actions}
          </div>
        </UnlessFullSidebar>
      </UnlessStacked>
      <div css={householdLayout.body}>
        <UnlessStacked>
          <section
            css={[stack.item, styles.trendSection]}
            aria-label={t({ en: "Trend", zh: "趋势" })}
          >
            <div css={styles.titleRow}>
              <Heading level={2} look="h3">
                {t({ en: "Household", zh: "家庭" })}
              </Heading>
              <div css={styles.ranges}>
                <ChartRangeChips value={range} onChange={setRange} />
              </div>
            </div>
            <Card css={styles.chartCard}>
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
        {nothingNeedsALook ? <UnlessStacked>{cards}</UnlessStacked> : cards}
        <StackedOnly>
          <AccountGroupList
            sheet={sheet}
            baseCurrency={currency}
            reorderHref={url.modeHref("reorder")}
            accountHref={(accountId) => url.hrefOf({ account: accountId })}
            selectedAccountId={url.account}
          />
        </StackedOnly>
      </div>
    </div>
  );
}

const styles = stylex.create({
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  title: {
    margin: 0,
  },
  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.tight,
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
    padding: space._3,
  },
  trend: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
  },
});
