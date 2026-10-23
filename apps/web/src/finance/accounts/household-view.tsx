"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import {
  SplitViewLink,
  StackedOnly,
  UnlessFullSidebar,
  UnlessStacked,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { selectQueueCounts } from "../transactions/select-queue-counts.ts";
import { AccountGroupList } from "./account-group-list.tsx";
import { BankBalanceSummary } from "./bank-balance-notice.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
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
import { selectWeekMovers } from "./select-week-movers.ts";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

interface HouseholdViewProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
  url: NetWorthUrl;
  onCreateAccount: () => void;
}

/**
 * The Household in the content column of Net worth: the trend of its net
 * worth with the range to show, the accounts that moved most this week, and
 * what needs a look. Where the sidebar does not show in full, today's
 * figures and the actions come first. Where the column fills a stack, as on
 * a phone, the headline names the Household in place of the title, and the
 * accounts by Group follow, because no sidebar shows them.
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

  return (
    <div css={stack.group}>
      <UnlessFullSidebar>
        <div css={stack.item}>
          <PickedHeadline sheet={sheet} today={today} currency={currency} />
          <NetWorthActions
            updateHref={url.modeHref("update")}
            onCreateAccount={onCreateAccount}
            flush
          />
        </div>
      </UnlessFullSidebar>
      <section css={stack.item} aria-label={t({ en: "Trend", zh: "趋势" })}>
        <div css={styles.titleRow}>
          <UnlessStacked>
            <Heading level={2} look="h3">
              {t({ en: "Household", zh: "家庭" })}
            </Heading>
          </UnlessStacked>
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
      <div css={styles.cards}>
        <WhatMoved today={today} currency={currency} url={url} />
        <NeedsALook sheet={sheet} url={url} />
      </div>
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
  );
}

/**
 * The accounts that moved net worth most since a week ago, each with a bar
 * from the middle: to the right for a gain, to the left for a loss, and the
 * signed change beside it. Each opens its account.
 */
function WhatMoved({
  today,
  currency,
  url,
}: {
  today: string;
  currency: string;
  url: NetWorthUrl;
}) {
  const movers = useReplica((snapshot) => selectWeekMovers(snapshot, today));
  const accountName = useAccountDisplayName();
  const largest = movers.reduce(
    (most, mover) => Math.max(most, Math.abs(mover.changeMinor)),
    0,
  );
  const titleId = "household-what-moved";

  return (
    <Card css={stack.tight} aria-labelledby={titleId} role="region">
      <Heading level={3} look="h4" id={titleId}>
        {t({ en: "What moved this week", zh: "本周变动" })}
      </Heading>
      {movers.length === 0 ? (
        <p css={[typeRole.bodySmall, styles.muted]}>
          {t({
            en: "No balance moved this week.",
            zh: "本周余额没有变动。",
          })}
        </p>
      ) : (
        <ul role="list" css={styles.movers}>
          {movers.map((mover) => {
            const share = `${String((Math.abs(mover.changeMinor) / largest) * 50)}%`;
            const gain = mover.changeMinor > 0;
            return (
              <li key={mover.account.id} css={styles.mover}>
                <SplitViewLink
                  href={url.hrefOf({ account: mover.account.id })}
                  {...stylex.props(
                    corner.radius_2,
                    transition.colors,
                    a11y.focusRingInset,
                    styles.moverLink,
                  )}
                >
                  <span css={[typeRole.bodySmall, styles.moverName]}>
                    {accountName(mover.account)}
                  </span>
                  <span aria-hidden css={[corner.radius_round, styles.track]}>
                    <span css={styles.axis} />
                    <span
                      css={[
                        corner.radius_round,
                        styles.bar,
                        gain ? styles.gain : styles.loss,
                        styles.barSize(share),
                      ]}
                    />
                  </span>
                  <span css={[typeRole.bodySmall, styles.moverChange]}>
                    <MoneyChange
                      changeMinor={mover.changeMinor}
                      currency={currency}
                      tone
                      whole
                    />
                  </span>
                </SplitViewLink>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/**
 * What waits for a member: each account whose bank balance differs, the
 * Transactions in Review, and the Expected Transactions dated today or
 * earlier.
 * Each line opens where to deal with it, and a line with nothing to do
 * does not show.
 */
function NeedsALook({ sheet, url }: { sheet: BalanceSheet; url: NetWorthUrl }) {
  const locale = useLocale();
  const { review: reviewCount, expected: expectedCount } =
    useReplica(selectQueueCounts);
  const differences = bankDifferenceLines(sheet);
  const count = (value: number) => new Intl.NumberFormat(locale).format(value);
  const oneReview = t({
    en: "1 transaction to review",
    zh: "1 笔交易待审核",
  });
  const manyReview = t({
    en: "{count} transactions to review",
    zh: "{count} 笔交易待审核",
  });
  const oneExpected = t({
    en: "1 expected transaction to confirm",
    zh: "1 笔待确认交易",
  });
  const manyExpected = t({
    en: "{count} expected transactions to confirm",
    zh: "{count} 笔待确认交易",
  });
  const titleId = "household-needs-a-look";
  const isEmpty =
    differences.length === 0 && reviewCount === 0 && expectedCount === 0;

  return (
    <Card css={stack.tight} aria-labelledby={titleId} role="region">
      <Heading level={3} look="h4" id={titleId}>
        {t({ en: "Needs a look", zh: "需要核对" })}
      </Heading>
      {isEmpty ? (
        <p css={[row.tight, typeRole.bodySmall, styles.muted]}>
          <CheckCircleIcon weight="bold" aria-hidden />
          {t({
            en: "Nothing needs a look.",
            zh: "暂时没有需要核对的。",
          })}
        </p>
      ) : (
        <div css={stack.tight}>
          {differences.map((line) =>
            line.bankLink ? (
              <BankBalanceSummary
                key={line.bankLink.id}
                link={line.bankLink}
                account={line.account}
                href={url.hrefOf({ account: line.account.id })}
              />
            ) : null,
          )}
          {reviewCount === 0 ? null : (
            <CheckLink
              href={getLocalePath("/finance/transactions?review=1", locale)}
            >
              {reviewCount === 1
                ? oneReview
                : manyReview.replace("{count}", count(reviewCount))}
            </CheckLink>
          )}
          {expectedCount === 0 ? null : (
            <CheckLink
              href={getLocalePath("/finance/transactions?expected=1", locale)}
            >
              {expectedCount === 1
                ? oneExpected
                : manyExpected.replace("{count}", count(expectedCount))}
            </CheckLink>
          )}
        </div>
      )}
    </Card>
  );
}

function CheckLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      {...stylex.props(
        flex.between,
        typeRole.bodySmall,
        corner.radius_3,
        transition.colors,
        a11y.focusRing,
        styles.check,
      )}
    >
      {children}
      <CaretRightIcon weight="bold" aria-hidden />
    </Link>
  );
}

const styles = stylex.create({
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
  chartCard: {
    display: "flex",
    flexDirection: "column",
    blockSize: { default: "15rem", [breakpoints.md]: "18.75rem" },
    padding: space._3,
  },
  trend: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minBlockSize: 0,
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
    gap: rhythm.item,
  },
  muted: {
    margin: 0,
    color: color.fgMuted,
  },
  // The rows share their columns, so the middle of every bar lines up.
  movers: {
    display: "grid",
    gridTemplateColumns: "minmax(0, auto) minmax(4rem, 1fr) auto",
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  mover: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
  },
  moverLink: {
    display: "grid",
    gridColumn: "1 / -1",
    gridTemplateColumns: "subgrid",
    alignItems: "center",
    columnGap: rhythm.item,
    paddingBlock: space._0,
    paddingInline: space._1,
    marginInline: `calc(-1 * ${space._1})`,
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  moverName: {
    maxInlineSize: "10rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  moverChange: {
    textAlign: "end",
  },
  // A gain grows right from the middle and a loss grows left, so that the
  // two read apart without their colour.
  track: {
    position: "relative",
    blockSize: space._1,
    backgroundColor: color.bgNeutralSubtle,
  },
  axis: {
    position: "absolute",
    insetBlock: `calc(-1 * ${space._0})`,
    insetInlineStart: "50%",
    inlineSize: border.size_1,
    backgroundColor: color.borderControl,
  },
  bar: {
    position: "absolute",
    insetBlock: 0,
  },
  barSize: (share: string) => ({
    inlineSize: share,
  }),
  gain: {
    insetInlineStart: "50%",
    backgroundColor: color.bgSuccess,
  },
  loss: {
    insetInlineEnd: "50%",
    backgroundColor: color.bgDanger,
  },
  check: {
    gap: rhythm.tight,
    paddingBlock: space._1,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
    fontWeight: font.weight_4,
  },
});
