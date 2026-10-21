"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, ViewTransition } from "react";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import type { ChartPick } from "../charts/time-series-chart.tsx";
import { useReplica } from "../replica/use-replica.ts";
import {
  SELECTION_CLEAR_TRANSITION,
  SELECTION_OPEN_TRANSITION,
} from "../shell/use-url-selection.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountGroupList } from "./account-group-list.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { NetWorthHeadline } from "./net-worth-headline.tsx";
import { NetWorthTrend } from "./net-worth-trend.tsx";
import { selectBalanceSheet } from "./select-balance-sheet.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";

/** The list moves only when the trend comes into it or leaves it. */
const LIST_SHIFT = {
  [SELECTION_OPEN_TRANSITION]: "net-worth-shift",
  [SELECTION_CLEAR_TRANSITION]: "net-worth-shift",
  default: "none",
};

const ReorderAccounts = dynamic(() =>
  import("./reorder-accounts.tsx").then((mod) => mod.ReorderAccounts),
);

interface NetWorthOverviewProps {
  /** False while the trend fills the pane beside the list. */
  showTrend: boolean;
}

/** The Net worth list: today's figure and its changes, the trend, then every account by Group. */
export function NetWorthOverview({ showTrend }: NetWorthOverviewProps) {
  const today = useHouseholdToday();
  const currency = useBaseCurrency();
  const sheet = useReplica((snapshot) => selectBalanceSheet(snapshot, today));
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const updateParams = new URLSearchParams(searchParams);
  updateParams.delete("account");
  updateParams.set("mode", "update");
  const reorderParams = new URLSearchParams(searchParams);
  reorderParams.set("mode", "reorder");
  const listParams = new URLSearchParams(searchParams);
  listParams.delete("mode");
  const listHref =
    listParams.size > 0 ? `${pathname}?${listParams.toString()}` : pathname;
  const hasAccounts = sheet.sections.some(
    (section) => section.lines.length > 0,
  );

  if (searchParams.get("mode") === "reorder") {
    return (
      <div css={stack.group}>
        <header css={stack.tight}>
          <div css={[cluster.item, styles.header]}>
            <Heading level={1} look="h3" css={styles.title}>
              {t({ en: "Reorder accounts", zh: "调整账户顺序" })}
            </Heading>
            <AnchorButton
              href={listHref}
              linkComponent={Link}
              size="sm"
              look="primary"
              icon={<CheckIcon weight="bold" />}
            >
              {t({ en: "Done", zh: "完成" })}
            </AnchorButton>
          </div>
          <Text as="p" look="bodySmall" tone="muted">
            {t({
              en: "Drag a group or an account to move it. An account stays in its group.",
              zh: "拖动分组或账户即可调整顺序。账户只能在所属分组内移动。",
            })}
          </Text>
        </header>
        <ReorderAccounts sheet={sheet} />
      </div>
    );
  }

  return (
    <div css={stack.group}>
      <div css={stack.tight}>
        <header css={[cluster.item, styles.header]}>
          <Heading level={1} look="h3" css={styles.title}>
            {t({ en: "Net worth", zh: "净资产" })}
          </Heading>
          <div css={cluster.tight}>
            <AnchorButton
              href={`${pathname}?${updateParams.toString()}`}
              linkComponent={Link}
              size="sm"
              icon={<ListChecksIcon weight="bold" />}
            >
              {t({ en: "Update balances", zh: "批量更新余额" })}
            </AnchorButton>
            <Button
              size="sm"
              icon={<PlusIcon weight="bold" />}
              onClick={() => {
                setCreating(true);
              }}
            >
              {t({ en: "Account", zh: "账户" })}
            </Button>
          </div>
        </header>
        {hasAccounts ? (
          <NetWorthSummary
            sheet={sheet}
            today={today}
            currency={currency}
            showTrend={showTrend}
          />
        ) : (
          <>
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
                onClick={() => {
                  setCreating(true);
                }}
              >
                {t({ en: "Add account", zh: "添加账户" })}
              </Button>
            </div>
          </>
        )}
      </div>
      {hasAccounts ? (
        <ViewTransition update={LIST_SHIFT} default="none">
          <AccountGroupList
            sheet={sheet}
            baseCurrency={currency}
            reorderHref={`${pathname}?${reorderParams.toString()}`}
          />
        </ViewTransition>
      ) : null}
      <AccountEditorSheet
        account={null}
        isOpen={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </div>
  );
}

/**
 * Today's figures and, where it has no pane of its own, the trend under
 * them. It holds the pick on the trend, so that a pick re-renders only this
 * part.
 */
function NetWorthSummary({
  sheet,
  today,
  currency,
  showTrend,
}: {
  sheet: BalanceSheet;
  today: string;
  currency: string;
  showTrend: boolean;
}) {
  const [pick, setPick] = useState<ChartPick | null>(null);
  return (
    <div css={stack.item}>
      <NetWorthHeadline
        sheet={sheet}
        today={today}
        currency={currency}
        pick={showTrend ? pick : null}
      />
      {showTrend ? <NetWorthTrend onPick={setPick} /> : null}
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
});
