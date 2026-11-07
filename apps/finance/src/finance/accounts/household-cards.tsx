"use client";

import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { color } from "@tuja/ui/color.stylex";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import {
  SplitViewLink,
  UnlessStacked,
} from "@tuja/ui/components/navigation-split-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { Ref } from "react";
import { Link } from "#src/links/link.tsx";
import { MoneyChange } from "../domain/money/money-change.tsx";
import { financeHref } from "../navigation/finance-href.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import type { AccountRow } from "../sync/row-schemas.ts";
import type { selectQueueCounts } from "../transactions/select-queue-counts.ts";
import { BankBalanceSummary } from "./bank-balance-notice.tsx";
import type { WeekMover } from "./build-week-movers.ts";
import { householdLayout } from "./household-layout.stylex.ts";
import type { bankDifferenceLines } from "./net-worth-sidebar.tsx";
import { selectWeekMovers } from "./select-week-movers.ts";
import { useMoverRows } from "./use-mover-rows.ts";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

/**
 * "Needs a look" and, unless stacked, "What moved this week", with as many
 * movers as `useMoverRows` finds room for. It is a component of its own, so
 * that a new measure does not render the trend again.
 */
export function HouseholdCards({
  differences,
  queue,
  today,
  currency,
  url,
}: {
  differences: ReturnType<typeof bankDifferenceLines>;
  queue: ReturnType<typeof selectQueueCounts>;
  today: string;
  currency: string;
  url: NetWorthUrl;
}) {
  const movers = useReplica((snapshot) => selectWeekMovers(snapshot, today));
  const { shown, floor, rowHeight, setColumn, setCard } = useMoverRows(
    movers.length,
  );

  return (
    <div
      ref={setColumn}
      css={[
        householdLayout.cards,
        floor != null && styles.cardsFloor(`${String(floor)}px`),
      ]}
    >
      <NeedsALook differences={differences} queue={queue} url={url} />
      <UnlessStacked>
        <WhatMoved
          movers={movers.slice(0, shown)}
          currency={currency}
          url={url}
          rowHeight={rowHeight}
          cardRef={setCard}
        />
      </UnlessStacked>
    </div>
  );
}

/**
 * The accounts that moved net worth most since a week ago, each with a bar
 * from the middle: to the right for a gain, to the left for a loss, and the
 * signed change beside it, in rows of `rowHeight`. Each opens its account.
 */
function WhatMoved({
  movers,
  currency,
  url,
  rowHeight,
  cardRef,
}: {
  movers: readonly WeekMover<AccountRow>[];
  currency: string;
  url: NetWorthUrl;
  rowHeight: number | null;
  cardRef: Ref<HTMLDivElement>;
}) {
  const accountName = useAccountDisplayName();
  const largest = movers.reduce(
    (most, mover) => Math.max(most, Math.abs(mover.changeMinor)),
    0,
  );
  const titleId = "household-what-moved";

  return (
    <Card
      ref={cardRef}
      css={[stack.tight, householdLayout.wideCard]}
      aria-labelledby={titleId}
      role="region"
    >
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
        <ul
          role="list"
          css={[
            styles.movers,
            rowHeight != null && styles.moverRows(`${String(rowHeight)}px`),
          ]}
        >
          {movers.map((mover) => {
            const share = `${String((Math.abs(mover.changeMinor) / largest) * 50)}%`;
            const gain = mover.changeMinor > 0;
            return (
              <li key={mover.account.id} css={styles.mover}>
                <SplitViewLink
                  href={url.hrefOf({ account: mover.account.id })}
                  {...stylex.props(
                    corner.radius_2,
                    a11y.touchRow,
                    quietSurface.interactive,
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
 * Each line opens where to deal with it. A line with nothing to do does not
 * show, and the card says so when no line shows.
 */
function NeedsALook({
  differences,
  queue: { review: reviewCount, expected: expectedCount },
  url,
}: {
  differences: ReturnType<typeof bankDifferenceLines>;
  queue: ReturnType<typeof selectQueueCounts>;
  url: NetWorthUrl;
}) {
  const locale = useLocale();
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

  const title = (
    <Heading level={3} look="h4" id={titleId}>
      {t({ en: "Needs a look", zh: "需要核对" })}
    </Heading>
  );

  if (differences.length === 0 && reviewCount === 0 && expectedCount === 0) {
    return (
      <Card
        css={[stack.tight, householdLayout.narrowCard]}
        aria-labelledby={titleId}
        role="region"
      >
        {title}
        <p css={[row.tight, typeRole.bodySmall, styles.muted]}>
          <CheckCircleIcon weight="bold" aria-hidden />
          {t({
            en: "Nothing needs a look.",
            zh: "暂时没有需要核对的。",
          })}
        </p>
      </Card>
    );
  }

  return (
    <Card
      css={[stack.tight, householdLayout.narrowCard]}
      aria-labelledby={titleId}
      role="region"
    >
      {title}
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
        {reviewCount === 0 && expectedCount === 0 ? null : (
          <List>
            {reviewCount === 0 ? null : (
              <ListRow
                href={financeHref(
                  { screen: "transactions", filters: { review: true } },
                  locale,
                )}
                linkComponent={Link}
              >
                {reviewCount === 1
                  ? oneReview
                  : manyReview.replace("{count}", count(reviewCount))}
              </ListRow>
            )}
            {expectedCount === 0 ? null : (
              <ListRow
                href={financeHref(
                  { screen: "transactions", filters: { expected: true } },
                  locale,
                )}
                linkComponent={Link}
              >
                {expectedCount === 1
                  ? oneExpected
                  : manyExpected.replace("{count}", count(expectedCount))}
              </ListRow>
            )}
          </List>
        )}
      </div>
    </Card>
  );
}

const styles = stylex.create({
  cardsFloor: (minBlockSize: string) => ({
    minBlockSize,
  }),
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
  moverRows: (gridAutoRows: string) => ({
    gridAutoRows,
  }),
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
});
