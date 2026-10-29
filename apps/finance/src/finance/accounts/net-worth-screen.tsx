"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Link } from "#src/links/link.tsx";
import {
  useTransactionTask,
  type TransactionTask,
} from "../editor/use-transaction-task.tsx";
import { ColumnLink, useColumnReplace } from "../navigation/column-link.tsx";
import { useReplica } from "../replica/use-replica.ts";
import { FinanceAddButton } from "../shell/finance-add-button.tsx";
import { FinancePageColumn } from "../shell/finance-page-column.tsx";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { AccountDetail } from "./account-detail.tsx";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountStrip } from "./account-strip.tsx";
import type { BalanceSheet } from "./build-balance-sheet.ts";
import { HouseholdView } from "./household-view.tsx";
import { NetWorthPickProvider } from "./net-worth-pick-provider.tsx";
import { NetWorthSidebar } from "./net-worth-sidebar.tsx";
import { NetWorthSkeleton } from "./net-worth-skeleton.tsx";
import { selectBalanceSheet } from "./select-balance-sheet.ts";
import { UpdateValuesForm } from "./update-values-form.tsx";
import { useBaseCurrency } from "./use-base-currency.ts";
import { useHouseholdToday } from "./use-household-today.ts";
import { useNetWorthUrl, type NetWorthUrl } from "./use-net-worth-url.ts";

const ReorderAccounts = dynamic(() =>
  import("./reorder-accounts.tsx").then((mod) => mod.ReorderAccounts),
);

/**
 * `/`: the Household and its accounts in columns. The sidebar lists
 * today's net worth and every account by Group. The content column shows the
 * Household (`/`) or one account (`?account=`), and the detail column
 * a Transaction of that account's Ledger (`&tx=`). Also the "Update
 * balances" form (`?mode=update`) and the reorder of the accounts
 * (`?mode=reorder`), each on a screen of its own.
 */
export function NetWorthScreen() {
  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const url = useNetWorthUrl();
  const isReorder = url.mode === "reorder";
  const task = useTransactionTask({
    screen: "netWorth",
    account: isReorder ? null : url.account,
  });

  if (!bootstrapped) return <NetWorthSkeleton />;
  if (url.mode === "update") {
    return (
      <FinancePageColumn>
        <UpdateValuesForm />
      </FinancePageColumn>
    );
  }
  return (
    <>
      {isReorder ? (
        <FinancePageColumn accessory={<FinanceAddButton />}>
          <ReorderScreen url={url} />
        </FinancePageColumn>
      ) : (
        <NetWorthPickProvider>
          <NetWorthColumns url={url} task={task} />
        </NetWorthPickProvider>
      )}
      {task.sheet}
    </>
  );
}

function NetWorthColumns({
  url,
  task,
}: {
  url: NetWorthUrl;
  task: TransactionTask;
}) {
  const replace = useColumnReplace();
  const today = useHouseholdToday();
  const currency = useBaseCurrency();
  const sheet = useReplica((snapshot) => selectBalanceSheet(snapshot, today));
  const accountName = useAccountDisplayName();
  const account = useReplica((snapshot) =>
    url.account === null ? null : snapshot.tables.accounts.get(url.account),
  );
  const groupName = useReplica((snapshot) =>
    account ? snapshot.tables.accountGroups.get(account.groupId)?.name : null,
  );
  const [creating, setCreating] = useState(false);
  const createAccount = () => {
    setCreating(true);
  };
  const householdLabel = t({ en: "Household", zh: "家庭" });
  const householdHref = url.hrefOf({ account: null });
  const netWorthLabel = t({ en: "Net worth", zh: "净资产" });

  return (
    <>
      <NavigationSplitView
        linkComponent={ColumnLink}
        replace={replace}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        sidebar={{
          label: netWorthLabel,
          node: (
            <NetWorthSidebar
              sheet={sheet}
              today={today}
              currency={currency}
              url={url}
              onCreateAccount={createAccount}
            />
          ),
        }}
        collapsedSidebar={<AccountStrip sheet={sheet} url={url} />}
        content={{
          label: account ? accountName(account) : householdLabel,
          key: url.account ?? "household",
          back:
            url.account === null
              ? null
              : {
                  href: householdHref,
                  label: groupName
                    ? `${netWorthLabel} · ${groupName}`
                    : netWorthLabel,
                },
          accessory: <FinanceAddButton />,
          node: (
            <div css={styles.column}>
              {url.account === null ? (
                <HouseholdView
                  sheet={sheet}
                  today={today}
                  currency={currency}
                  url={url}
                  onCreateAccount={createAccount}
                />
              ) : (
                <AccountDetail
                  accountId={url.account}
                  onDeleted={() => {
                    replace(householdHref);
                  }}
                />
              )}
            </div>
          ),
        }}
        detail={
          url.account !== null && url.tx !== null
            ? {
                label: t({ en: "Transaction", zh: "交易" }),
                key: url.tx,
                back: {
                  href: url.hrefOf({ account: url.account }),
                  label: account ? accountName(account) : "",
                },
                node: task.detail(url.tx),
              }
            : null
        }
      />
      <AccountEditorSheet
        account={null}
        isOpen={creating}
        onClose={() => {
          setCreating(false);
        }}
      />
    </>
  );
}

/** `?mode=reorder`: every Group and account with a handle that moves it. */
function ReorderScreen({ url }: { url: NetWorthUrl }) {
  const today = useHouseholdToday();
  const sheet: BalanceSheet = useReplica((snapshot) =>
    selectBalanceSheet(snapshot, today),
  );
  return (
    <div css={stack.group}>
      <header css={stack.tight}>
        <div css={[cluster.item, styles.header]}>
          <Heading level={1} look="h3" css={styles.title}>
            {t({ en: "Reorder accounts", zh: "调整账户顺序" })}
          </Heading>
          <AnchorButton
            href={url.modeHref(null)}
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

const styles = stylex.create({
  column: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  header: {
    justifyContent: "space-between",
    rowGap: rhythm.tight,
  },
  title: {
    margin: 0,
  },
});
