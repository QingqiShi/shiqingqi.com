"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { listRowTokens } from "@tuja/ui/components/list.stylex";
import {
  SplitViewLink,
  StackedOnly,
  UnlessStacked,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { sidebarEdge } from "@tuja/ui/components/navigation-split-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { ChartRangeChips } from "../charts/chart-range-chips.tsx";
import { AccountGroupList } from "./account-group-list.tsx";
import { AccountNavList } from "./account-nav-list.tsx";
import { BankBalanceSummary } from "./bank-balance-notice.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import {
  NetWorthHeadline,
  type NetWorthHeadlineForm,
} from "./net-worth-headline.tsx";
import {
  useNetWorthPick,
  useSetNetWorthPick,
} from "./net-worth-pick-provider.tsx";
import { NetWorthTrend, useNetWorthRange } from "./net-worth-trend.tsx";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

interface NetWorthSheetProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
}

const STACKED_TREND_HEIGHT = 200;

/** Whether the balance sheet has an account to show. */
export function hasAccounts(sheet: BalanceSheet) {
  return sheet.sections.some((section) => section.lines.length > 0);
}

/**
 * The first column of Net worth. Beside the content it is a list of links:
 * see `AccountNavList`. Where it is a page of its own, it is today's net
 * worth, which is the Household and opens it; its trend with the range to
 * show; "Update balances" and
 * "+ Account"; each account whose bank balance differs; and every account
 * by Group.
 */
export function NetWorthSidebar({
  sheet,
  today,
  currency,
  url,
  onCreateAccount,
}: NetWorthSheetProps & { url: NetWorthUrl; onCreateAccount: () => void }) {
  const householdRef = useSplitViewShared("household");
  const actionsRef = useSplitViewShared("sidebar-actions");
  const differencesRef = useSplitViewShared("sidebar-bank-differences");
  const accountsRef = useSplitViewShared("sidebar-accounts");
  return (
    <>
      <UnlessStacked>
        <AccountNavList
          sheet={sheet}
          currency={currency}
          url={url}
          onCreateAccount={onCreateAccount}
        />
      </UnlessStacked>
      <StackedOnly>
        <div css={[stack.item, sidebarEdge.text]}>
          <SplitViewLink
            ref={householdRef}
            href={url.hrefOf({ account: null, household: true })}
            aria-current={url.account === null ? "page" : undefined}
            {...stylex.props(
              corner.radius_3,
              quietSurface.interactive,
              styles.household,
            )}
          >
            <PickedHeadline sheet={sheet} today={today} currency={currency} />
          </SplitViewLink>
          <StackedTrend />
          <div ref={actionsRef}>
            <NetWorthActions
              updateHref={url.modeHref("update")}
              onCreateAccount={onCreateAccount}
            />
          </div>
          {bankDifferenceLines(sheet).length === 0 ? null : (
            <div ref={differencesRef}>
              <BankDifferences sheet={sheet} url={url} />
            </div>
          )}
          <div ref={accountsRef}>
            <AccountGroupList
              sheet={sheet}
              baseCurrency={currency}
              reorderHref={url.modeHref("reorder")}
              accountHref={(accountId) => url.hrefOf({ account: accountId })}
              selectedAccountId={url.account}
            />
          </div>
        </div>
      </StackedOnly>
    </>
  );
}

/** The net-worth trend of the page, with the range under it. A pick on it shows in the headline. */
function StackedTrend() {
  const [range, setRange] = useNetWorthRange();
  const setPick = useSetNetWorthPick();
  useEffect(
    () => () => {
      setPick(null);
    },
    [setPick],
  );
  return (
    <section css={stack.item} aria-label={t({ en: "Trend", zh: "趋势" })}>
      <NetWorthTrend
        range={range}
        height={STACKED_TREND_HEIGHT}
        onPick={setPick}
        bleeds
      />
      <ChartRangeChips value={range} onChange={setRange} />
    </section>
  );
}

/** "Update balances" and "+ Account". */
export function NetWorthActions({
  updateHref,
  onCreateAccount,
}: {
  updateHref: string;
  onCreateAccount: () => void;
}) {
  return (
    <div css={cluster.tight}>
      <Button
        href={updateHref}
        size="sm"
        icon={<ListChecksIcon weight="bold" />}
      >
        {t({ en: "Update balances", zh: "批量更新余额" })}
      </Button>
      <Button
        size="sm"
        icon={<PlusIcon weight="bold" />}
        onClick={onCreateAccount}
      >
        {t({ en: "Account", zh: "账户" })}
      </Button>
    </div>
  );
}

/** Each account whose Bank balance differs from ours, which opens the account. */
function BankDifferences({
  sheet,
  url,
}: {
  sheet: BalanceSheet;
  url: NetWorthUrl;
}) {
  const lines = bankDifferenceLines(sheet);
  if (lines.length === 0) return null;
  return (
    <div css={stack.tight}>
      {lines.map((line) =>
        line.bankLink ? (
          <BankBalanceSummary
            key={line.bankLink.id}
            link={line.bankLink}
            account={line.account}
            href={url.hrefOf({ account: line.account.id })}
          />
        ) : null,
      )}
    </div>
  );
}

/** The shown accounts whose balance check found a difference. */
export function bankDifferenceLines(sheet: BalanceSheet) {
  return sheet.sections.flatMap((section) =>
    section.lines.filter(
      (line) => line.hidden === null && line.balanceCheck !== null,
    ),
  );
}

/**
 * Today's net worth, or what is picked on a trend. While it does not show,
 * such as in a hidden column, a pick does not draw it again.
 */
export function PickedHeadline({
  sheet,
  today,
  currency,
  form,
}: NetWorthSheetProps & { form?: NetWorthHeadlineForm }) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const pick = useNetWorthPick(element);
  return (
    <div ref={setElement}>
      <NetWorthHeadline
        sheet={sheet}
        today={today}
        currency={currency}
        pick={pick}
        form={form}
      />
    </div>
  );
}

/** What Net worth shows before the Household has an account. */
export function NoAccounts({
  onCreateAccount,
}: {
  onCreateAccount: () => void;
}) {
  return (
    <div css={stack.tight}>
      <Heading level={1} look="h3">
        {t({ en: "Net worth", zh: "净资产" })}
      </Heading>
      <Text as="p" look="body">
        {t({ en: "No accounts yet.", zh: "还没有账户。" })}
      </Text>
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "Add each current account, card, investment, property and loan, with today's balance. Net worth adds them up from there.",
          zh: "添加每个活期账户、信用卡、投资、房产和贷款，并填写今天的余额，净资产会据此汇总。",
        })}
      </Text>
      <div>
        <Button
          look="primary"
          icon={<PlusIcon weight="bold" />}
          onClick={onCreateAccount}
        >
          {t({ en: "Add account", zh: "添加账户" })}
        </Button>
      </div>
    </div>
  );
}

const styles = stylex.create({
  // The plate reaches into the gutter as far as the plate of an account row,
  // so that the headline lines up with the text around it.
  household: {
    display: "block",
    marginInline: `calc(-1 * ${listRowTokens.plateInset})`,
    paddingBlock: space._2,
    paddingInline: listRowTokens.plateInset,
  },
});
