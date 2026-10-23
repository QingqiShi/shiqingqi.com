"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import {
  SplitViewLink,
  useSplitViewShared,
} from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { selected } from "@tuja/ui/primitives/selected.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { color, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useState } from "react";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { AccountGroupList } from "./account-group-list.tsx";
import { BankBalanceSummary } from "./bank-balance-notice.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { NetWorthHeadline } from "./net-worth-headline.tsx";
import {
  useNetWorthPick,
  useSetNetWorthPick,
} from "./net-worth-pick-provider.tsx";
import {
  HOUSEHOLD_TREND,
  NetWorthTrend,
  useNetWorthRange,
} from "./net-worth-trend.tsx";
import type { NetWorthUrl } from "./use-net-worth-url.ts";

/** The height of the trend in the sidebar, in pixels. */
const SIDEBAR_TREND_HEIGHT = 120;

interface NetWorthSheetProps {
  sheet: BalanceSheet;
  today: string;
  currency: string;
}

/** Whether the balance sheet has an account to show. */
export function hasAccounts(sheet: BalanceSheet) {
  return sheet.sections.some((section) => section.lines.length > 0);
}

/**
 * The first column of Net worth: today's net worth, which is the Household
 * and opens it, and its trend while an account is open; "Update balances"
 * and "+ Account"; each account whose bank balance differs; and every
 * account by Group.
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
  if (!hasAccounts(sheet)) {
    return <NoAccounts onCreateAccount={onCreateAccount} />;
  }
  return (
    <div css={stack.item}>
      <div css={stack.tight}>
        <SplitViewLink
          ref={householdRef}
          href={url.hrefOf({ account: null })}
          aria-current={url.account === null ? "page" : undefined}
          {...stylex.props(
            corner.radius_3,
            transition.colors,
            selected.quiet,
            a11y.focusRingInset,
            styles.household,
          )}
        >
          <PickedHeadline sheet={sheet} today={today} currency={currency} />
        </SplitViewLink>
        {url.account === null ? null : <SidebarTrend />}
      </div>
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
  );
}

/**
 * The net-worth trend under the headline while an account is open, so that
 * the Household's trend stays in view. A pick on it shows in the headline.
 */
function SidebarTrend() {
  const [range] = useNetWorthRange();
  const setPick = useSetNetWorthPick();
  const trendRef = useSplitViewShared(HOUSEHOLD_TREND);
  useEffect(
    () => () => {
      setPick(null);
    },
    [setPick],
  );
  return (
    <div css={styles.trend}>
      <div ref={trendRef}>
        <NetWorthTrend
          range={range}
          height={SIDEBAR_TREND_HEIGHT}
          onPick={setPick}
          shared={HOUSEHOLD_TREND}
        />
      </div>
    </div>
  );
}

/**
 * "Update balances" and "+ Account". In the sidebar they line up with the
 * text of the headline card; elsewhere, `flush`, with the column's edge.
 */
export function NetWorthActions({
  updateHref,
  onCreateAccount,
  flush = false,
}: {
  updateHref: string;
  onCreateAccount: () => void;
  flush?: boolean;
}) {
  return (
    <div css={[cluster.tight, !flush && styles.inset]}>
      <AnchorButton
        href={updateHref}
        linkComponent={Link}
        size="sm"
        icon={<ListChecksIcon weight="bold" />}
      >
        {t({ en: "Update balances", zh: "批量更新余额" })}
      </AnchorButton>
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
export function BankDifferences({
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

/** The shown accounts whose Bank link reports a balance that differs from ours. */
export function bankDifferenceLines(sheet: BalanceSheet) {
  return sheet.sections.flatMap((section) =>
    section.lines.filter(
      (line) =>
        line.hidden === null && line.bankLink?.balanceDifferenceMinor != null,
    ),
  );
}

/**
 * Today's net worth, or what is picked on a trend. While it does not show,
 * such as in a hidden column, a pick does not draw it again.
 */
export function PickedHeadline({ sheet, today, currency }: NetWorthSheetProps) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const pick = useNetWorthPick(element);
  return (
    <div ref={setElement}>
      <NetWorthHeadline
        sheet={sheet}
        today={today}
        currency={currency}
        pick={pick}
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
    <div css={[stack.tight, styles.inset]}>
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
  household: {
    display: "block",
    padding: space._2,
    color: color.fg,
    textDecoration: "none",
  },
  // The trend and the actions line up with the text of the headline.
  trend: {
    paddingInline: space._2,
  },
  inset: {
    paddingInline: space._2,
  },
});
