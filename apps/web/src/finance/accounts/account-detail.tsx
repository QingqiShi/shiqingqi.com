"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { AccountKind } from "../domain/accounts/side-of-kind.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useBankErrorMessage } from "../settings/use-bank-error-message.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { AccountChart } from "./account-chart.tsx";
import { accountDetailLine } from "./account-detail-line.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountLedger } from "./account-ledger.tsx";
import { BankBalanceNotice } from "./bank-balance-notice.tsx";
import { UpdateBalanceSheet } from "./update-balance-sheet.tsx";
import { useHouseholdToday } from "./use-household-today.ts";

interface AccountDetailProps {
  accountId: string;
  /** 1 on the account's own page, 2 in the pane beside the Net worth list. */
  headingLevel: 1 | 2;
  /** Leaves the account's screen once it is deleted. */
  onDeleted: () => void;
}

/**
 * One account: its balance and history chart, the facts of its kind, its
 * Bank link, and its ledger, with "Update" and "Edit".
 */
export function AccountDetail({
  accountId,
  headingLevel,
  onDeleted,
}: AccountDetailProps) {
  const locale = useLocale();
  const today = useHouseholdToday();
  const account = useReplica((snapshot) =>
    snapshot.tables.accounts.get(accountId),
  );
  const groups = useReplica((snapshot) => snapshot.tables.accountGroups);
  const members = useReplica((snapshot) => snapshot.tables.members);
  const bankLink = useReplica(
    (snapshot) =>
      liveRowSelectors
        .bankLinks(snapshot)
        .find((link) => link.accountId === accountId) ?? null,
  );
  const balance = useReplica((snapshot) =>
    account
      ? accountBalanceAt(
          account,
          selectBalanceSeriesByAccount(snapshot).get(accountId),
          today,
        )
      : 0,
  );
  const bankErrorMessage = useBankErrorMessage();
  const [updating, setUpdating] = useState(false);
  const [editing, setEditing] = useState(false);

  const kindLabels: Record<AccountKind, string> = {
    cash: t({ en: "Cash", zh: "现金" }),
    credit: t({ en: "Credit card", zh: "信用卡" }),
    investment: t({ en: "Investment", zh: "投资" }),
    property: t({ en: "Property", zh: "房产" }),
    loan: t({ en: "Loan", zh: "贷款" }),
    receivable: t({ en: "Money owed to you", zh: "应收款" }),
  };

  if (!account || account.deletedAt !== null) {
    return (
      <Text look="bodySmall" tone="muted">
        {t({ en: "This account no longer exists.", zh: "这个账户已不存在。" })}
      </Text>
    );
  }

  const ownerName =
    account.ownerMemberId === null
      ? null
      : (members.get(account.ownerMemberId)?.name ?? null);
  const detail = accountDetailLine(account, ownerName);
  const group = groups.get(account.groupId);
  const money = (minor: number) => formatMoney(minor, account.currency, locale);

  const facts: { key: string; label: string; value: string }[] = [];
  if (account.kind === "credit") {
    if (account.creditLimitMinor !== null) {
      facts.push({
        key: "limit",
        label: t({ en: "Credit limit", zh: "信用额度" }),
        value: money(account.creditLimitMinor),
      });
      facts.push({
        key: "available",
        label: t({ en: "Available", zh: "可用额度" }),
        value: money(account.creditLimitMinor + balance),
      });
    }
    if (account.statementDay !== null) {
      facts.push({
        key: "statement",
        label: t({ en: "Statement day", zh: "账单日" }),
        value: String(account.statementDay),
      });
    }
    if (account.paymentDueDay !== null) {
      facts.push({
        key: "due",
        label: t({ en: "Payment due day", zh: "还款日" }),
        value: String(account.paymentDueDay),
      });
    }
  }
  if (bankLink) {
    facts.push({
      key: "bank",
      label: t({ en: "Bank link", zh: "银行关联" }),
      value: [
        bankLink.providerName || bankLink.providerInstitution,
        bankLink.lastSyncAt === null
          ? t({ en: "not synced yet", zh: "尚未同步" })
          : `${t({ en: "synced", zh: "同步于" })} ${displayDay(bankLink.lastSyncAt.slice(0, 10), locale, "day")}`,
        bankLink.status === "active"
          ? ""
          : t({
              en: "reconnect in Lunch Flow",
              zh: "需在 Lunch Flow 重新连接",
            }),
        bankErrorMessage(bankLink.lastError) ?? "",
      ]
        .filter((part) => part !== "")
        .join(" · "),
    });
  }

  return (
    <article css={stack.group}>
      <header css={stack.item}>
        <div css={stack.tight}>
          <Heading level={headingLevel} look="h3">
            {account.name}
          </Heading>
          <div css={[cluster.tight, typeRole.bodySmall, styles.muted]}>
            <span>
              {[detail, kindLabels[account.kind], group?.name ?? ""]
                .filter((part) => part !== "")
                .join(" · ")}
            </span>
            {account.closedOn !== null ? (
              <Badge size="sm" intent="neutral">
                {`${t({ en: "Closed", zh: "已关闭" })} ${displayDay(account.closedOn, locale, "day")}`}
              </Badge>
            ) : null}
            {account.excludedFromNetWorth ? (
              <Badge size="sm" intent="neutral">
                {t({ en: "Not counted", zh: "不计入" })}
              </Badge>
            ) : null}
          </div>
        </div>
        <span css={[typeRole.h2, styles.balance]}>{money(balance)}</span>
        <div css={cluster.tight}>
          <Button
            size="sm"
            look="primary"
            icon={<ArrowsClockwiseIcon weight="bold" />}
            onClick={() => {
              setUpdating(true);
            }}
          >
            {t({ en: "Update balance", zh: "更新余额" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            icon={<PencilSimpleIcon weight="bold" />}
            onClick={() => {
              setEditing(true);
            }}
          >
            {t({ en: "Edit", zh: "编辑" })}
          </Button>
        </div>
      </header>
      {bankLink ? (
        <BankBalanceNotice
          link={bankLink}
          accountName={account.name}
          showName={false}
        />
      ) : null}
      <AccountChart account={account} today={today} />
      {facts.length > 0 ? (
        <dl css={styles.facts}>
          {facts.map((fact) => (
            <div key={fact.key} css={styles.fact}>
              <dt css={[typeRole.caption, styles.muted]}>{fact.label}</dt>
              <dd
                css={[
                  typeRole.bodySmall,
                  typeModifier.numeric,
                  styles.factValue,
                ]}
              >
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div css={stack.item}>
        <Heading level={headingLevel === 1 ? 2 : 3} look="h4">
          {t({ en: "Ledger", zh: "明细" })}
        </Heading>
        <AccountLedger account={account} />
      </div>
      <UpdateBalanceSheet
        line={updating ? { account, ownerName, bankLink } : null}
        today={today}
        onClose={() => {
          setUpdating(false);
        }}
      />
      <AccountEditorSheet
        account={account}
        isOpen={editing}
        onClose={() => {
          setEditing(false);
        }}
        onDeleted={onDeleted}
      />
    </article>
  );
}

const styles = stylex.create({
  muted: {
    color: color.fgMuted,
  },
  balance: {
    fontWeight: font.weight_7,
  },
  facts: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(9rem, 1fr))",
    gap: rhythm.item,
    margin: 0,
  },
  fact: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: 0,
  },
  factValue: {
    margin: 0,
  },
});
