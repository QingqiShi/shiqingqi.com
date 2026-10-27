"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import type { AccountKind } from "../domain/accounts/side-of-kind.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { DrawnAfterRest } from "../shell/drawn-after-rest.tsx";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { AccountChartSkeleton } from "./account-chart-skeleton.tsx";
import { AccountChart } from "./account-chart.tsx";
import { accountDetailLine } from "./account-detail-line.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountLedgerSkeleton } from "./account-ledger-skeleton.tsx";
import { AccountLedger } from "./account-ledger.tsx";
import { BankBalanceNotice } from "./bank-balance-notice.tsx";
import { BankLinkStatus } from "./bank-link-status.tsx";
import { CreditUsageMeter } from "./credit-usage-meter.tsx";
import { UpdateBalanceSheet } from "./update-balance-sheet.tsx";
import { useHouseholdToday } from "./use-household-today.ts";

interface AccountDetailProps {
  accountId: string;
  onDeleted: () => void;
}

/**
 * One account in the content column of Net worth: who and what it is, with
 * its balance and the actions on it beside that where the column is wide
 * enough, the bank's balance where it differs, its chart, and its Ledger.
 * The chart and the Ledger take the most time to draw, so they draw after
 * the rest, as skeletons first, and fade in. Thus a push to the account
 * starts at once.
 */
export function AccountDetail({ accountId, onDeleted }: AccountDetailProps) {
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
  const accountName = useAccountDisplayName();
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
  const creditLimit =
    account.kind === "credit" ? account.creditLimitMinor : null;
  return (
    <article css={[stack.item, styles.container]}>
      <header css={styles.header}>
        <div css={[stack.text, styles.names]}>
          <Heading level={2} look="h3">
            {accountName(account)}
          </Heading>
          <div css={[cluster.tight, typeRole.bodySmall, styles.muted]}>
            <span>
              {[
                detail,
                account.isSystem ? "" : kindLabels[account.kind],
                group?.name ?? "",
              ]
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
          {bankLink ? <BankLinkStatus link={bankLink} /> : null}
        </div>
        <div css={[stack.tight, styles.side]}>
          <span css={[typeRole.h2, typeModifier.numeric, styles.balance]}>
            {money(balance)}
          </span>
          {account.isSystem ? null : (
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
                icon={<PencilSimpleIcon weight="bold" />}
                onClick={() => {
                  setEditing(true);
                }}
              >
                {t({ en: "Edit", zh: "编辑" })}
              </Button>
            </div>
          )}
        </div>
      </header>
      {account.isSystem ? (
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Money on its way between your accounts. It moves to the account it reaches when that bank shows it.",
            zh: "在你的账户之间转账途中的钱。到账的银行显示这笔钱后，它会移到那个账户。",
          })}
        </Text>
      ) : null}
      {bankLink ? <BankBalanceNotice link={bankLink} /> : null}
      <Card css={styles.card}>
        <DrawnAfterRest
          contentKey={account.id}
          skeleton={<AccountChartSkeleton />}
        >
          <AccountChart account={account} today={today} />
        </DrawnAfterRest>
      </Card>
      <div css={[stack.item, styles.creditFacts]}>
        {creditLimit === null ? null : (
          <CreditUsageMeter
            balanceMinor={balance}
            limitMinor={creditLimit}
            currency={account.currency}
          />
        )}
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
      </div>
      <div css={stack.tight}>
        <Heading level={3} look="h4">
          {t({ en: "Ledger", zh: "明细" })}
        </Heading>
        <Card css={styles.ledgerCard}>
          <DrawnAfterRest
            contentKey={account.id}
            skeleton={<AccountLedgerSkeleton />}
          >
            <AccountLedger account={account} today={today} />
          </DrawnAfterRest>
        </Card>
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

/** Where the column has room for the balance and its actions beside the name. */
const WIDE = "@container (min-width: 34rem)";
/** Where the chart's range chips need the card's inset to show in full. */
const NARROW = "@container (max-width: 24rem)";

const styles = stylex.create({
  container: {
    containerType: "inline-size",
  },
  header: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [WIDE]: "minmax(0, 1fr) auto",
    },
    alignItems: "start",
    gap: rhythm.item,
  },
  names: {
    minInlineSize: 0,
  },
  side: {
    alignItems: { default: "flex-start", [WIDE]: "flex-end" },
  },
  card: {
    paddingBlock: space._3,
    paddingInline: { default: space._3, [NARROW]: space._2 },
  },
  ledgerCard: {
    paddingBlock: space._1,
    paddingInline: space._1,
  },
  muted: {
    color: color.fgMuted,
  },
  balance: {
    fontWeight: font.weight_7,
  },
  creditFacts: {
    display: { default: "flex", ":empty": "none" },
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
