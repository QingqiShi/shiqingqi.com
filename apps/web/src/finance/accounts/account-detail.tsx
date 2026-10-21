"use client";

import { ArrowsClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowsClockwise";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
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
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { AccountChart } from "./account-chart.tsx";
import { accountDetailLine } from "./account-detail-line.ts";
import { AccountEditorSheet } from "./account-editor-sheet.tsx";
import { AccountLedger } from "./account-ledger.tsx";
import { BankBalanceNotice } from "./bank-balance-notice.tsx";
import { BankLinkStatus } from "./bank-link-status.tsx";
import { CreditUsageMeter } from "./credit-usage-meter.tsx";
import { institutionIconUrl } from "./institution-icon-url.ts";
import { UpdateBalanceSheet } from "./update-balance-sheet.tsx";
import { useHouseholdToday } from "./use-household-today.ts";

interface AccountDetailProps {
  accountId: string;
  /** 1 on the account's own page, 2 in the pane beside the Net worth list. */
  headingLevel: 1 | 2;
  onDeleted: () => void;
  /** Shows a Close button that calls it, for the pane beside the Net worth list. */
  onClose?: () => void;
}

export function AccountDetail({
  accountId,
  headingLevel,
  onDeleted,
  onClose,
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
  const layout = headingLevel === 1 ? pageLayout : null;
  const ledgerHeadingLevel = headingLevel === 1 ? 2 : 3;

  return (
    <article css={layout?.container}>
      <div css={[stack.group, layout?.columns]}>
        <div css={[stack.group, layout?.aside]}>
          <header css={stack.item}>
            <div css={[flex.row, styles.identity]}>
              <Avatar
                name={account.institution.trim() || accountName(account)}
                src={institutionIconUrl(account)}
                shape="square"
                size="lg"
                aria-hidden
              />
              <div css={[flex.col, styles.names]}>
                <Heading level={headingLevel} look="h3">
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
              </div>
              {onClose ? (
                <Button
                  look="ghost"
                  size="sm"
                  icon={<XIcon weight="bold" />}
                  aria-label={t({ en: "Close", zh: "关闭" })}
                  css={styles.close}
                  onClick={onClose}
                />
              ) : null}
            </div>
            <span
              css={[typeRole.subDisplay, typeModifier.numeric, styles.balance]}
            >
              {money(balance)}
            </span>
            {account.isSystem ? (
              <Text look="bodySmall" tone="muted">
                {t({
                  en: "Money on its way between your accounts. It moves to the account it reaches when that bank shows it.",
                  zh: "在你的账户之间转账途中的钱。到账的银行显示这笔钱后，它会移到那个账户。",
                })}
              </Text>
            ) : (
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
            )}
            {bankLink ? <BankLinkStatus link={bankLink} /> : null}
          </header>
          {bankLink ? (
            <BankBalanceNotice link={bankLink} account={account} />
          ) : null}
          <AccountChart account={account} today={today} />
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
        </div>
        <div css={[stack.item, layout?.ledger]}>
          <Heading level={ledgerHeadingLevel} look="h4">
            {t({ en: "Ledger", zh: "明细" })}
          </Heading>
          <AccountLedger
            account={account}
            today={today}
            dayHeadingLevel={ledgerHeadingLevel === 2 ? 3 : 4}
          />
        </div>
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

const TWO_COLUMNS = "@container (min-width: 60rem)";
const TALL_ENOUGH = "@media (min-height: 48rem)";

const pageLayout = stylex.create({
  container: {
    containerType: "inline-size",
  },
  columns: {
    display: { default: "flex", [TWO_COLUMNS]: "grid" },
    gridTemplateColumns: {
      default: null,
      [TWO_COLUMNS]: "minmax(0, 1fr) minmax(0, 36rem)",
    },
    columnGap: { default: null, [TWO_COLUMNS]: rhythm.section },
    maxInlineSize: { default: "40rem", [TWO_COLUMNS]: "none" },
    alignItems: { default: null, [TWO_COLUMNS]: "start" },
  },
  aside: {
    position: {
      default: null,
      [TWO_COLUMNS]: { default: null, [TALL_ENOUGH]: "sticky" },
    },
    insetBlockStart: { default: null, [TWO_COLUMNS]: space._4 },
  },
  ledger: {
    minInlineSize: 0,
  },
});

const styles = stylex.create({
  identity: {
    gap: rhythm.item,
    minInlineSize: 0,
  },
  names: {
    gap: rhythm.inline,
    minInlineSize: 0,
  },
  close: {
    alignSelf: "flex-start",
    marginInlineStart: "auto",
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
