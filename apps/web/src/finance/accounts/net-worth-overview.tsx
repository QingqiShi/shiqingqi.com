"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountGroupList } from "./account-group-list.tsx";
import { NetWorthHeadline } from "./net-worth-headline.tsx";
import { NetWorthTrend } from "./net-worth-trend.tsx";
import { selectBalanceSheet } from "./select-balance-sheet.ts";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";

interface NetWorthOverviewProps {
  /** False where the trend chart has a pane of its own. */
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

  return (
    <div css={stack.group}>
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
      {sheet.sections.some((section) => section.lines.length > 0) ? (
        <>
          <NetWorthHeadline sheet={sheet} today={today} currency={currency} />
          {showTrend ? <NetWorthTrend /> : null}
          <AccountGroupList
            sheet={sheet}
            baseCurrency={currency}
            today={today}
          />
        </>
      ) : (
        <div css={stack.tight}>
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
        </div>
      )}
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

const styles = stylex.create({
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  title: {
    margin: 0,
  },
});
