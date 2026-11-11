"use client";

import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { t } from "@tuja/i18n";
import { useLocale } from "@tuja/i18n/use-locale";
import { Anchor } from "@tuja/ui/components/anchor";
import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { List } from "@tuja/ui/components/list";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import type { AccountRow, BankLinkRow } from "../sync/row-schemas.ts";
import { LedgerEntryLink } from "./ledger-entry-link.tsx";
import { useBalanceCheck, type BalanceCheckView } from "./use-balance-check.ts";
import { useDescribeLedgerEntry } from "./use-describe-ledger-entry.ts";
import { useNetWorthUrl } from "./use-net-worth-url.ts";

/**
 * One line on Net worth for a Bank link whose balance disagrees: the account,
 * how far off the bank it is, and how many Entries the bank does not show.
 * It opens the account, where the notice lists them.
 */
export function BankBalanceSummary({
  link,
  account,
  href,
}: {
  link: BankLinkRow;
  account: AccountRow;
  href: string;
}) {
  const locale = useLocale();
  const view = useBalanceCheck(link);
  const offLabel = t({
    en: "{amount} off the bank",
    zh: "与银行相差 {amount}",
  });
  const oneLabel = t({
    en: "1 transaction the bank doesn't show",
    zh: "银行未显示 1 笔交易",
  });
  const manyLabel = t({
    en: "{count} transactions the bank doesn't show",
    zh: "银行未显示 {count} 笔交易",
  });
  if (view === null) return null;
  const count = view.unbacked?.length ?? 0;
  const parts = [
    account.name,
    offLabel.replace(
      "{amount}",
      formatMoney(Math.abs(view.check.ourExcessMinor), link.currency, locale),
    ),
  ];
  if (count === 1) parts.push(oneLabel);
  if (count > 1) {
    parts.push(
      manyLabel.replace("{count}", new Intl.NumberFormat(locale).format(count)),
    );
  }

  return (
    <Callout intent="warning" role="status">
      <Text look="bodySmall" numeric measure="none">
        <Anchor
          href={href}
          linkComponent={SplitViewLink}
          newTabLabel={t({
            en: "(opens in new tab)",
            zh: "(在新标签页中打开)",
          })}
        >
          {parts[0]}
        </Anchor>
        {` · ${parts.slice(1).join(" · ")}`}
      </Text>
    </Callout>
  );
}

/**
 * "Bank says £X · we say £Y", and the Entries no bank row backs, oldest
 * first: each is a payment the bank has not posted yet, a duplicate to
 * delete here, or a real payment the bank left out, to keep here. Where our
 * balance is above the bank's, what they do not explain is money out that the
 * ledger lacks; where it is below, it is older than the bank's records, or the
 * bank left it out.
 */
export function BankBalanceNotice({ link }: { link: BankLinkRow }) {
  const locale = useLocale();
  const view = useBalanceCheck(link);
  const bankSaysLabel = t({ en: "Bank says", zh: "银行显示" });
  const weSayLabel = t({ en: "we say", zh: "账本显示" });
  if (view === null) return null;
  const { check } = view;
  const money = (minor: number) => formatMoney(minor, link.currency, locale);

  return (
    <Callout intent="warning" role="status">
      <div css={stack.tight}>
        <Text look="bodySmall" measure="none">
          <Text as="span" look="bodySmall" numeric>
            {`${bankSaysLabel} ${money(check.bankMinor)} · ${weSayLabel} ${money(check.oursMinor)}`}
          </Text>
          <Text as="span" look="bodySmall" tone="muted">
            {` · ${displayDay(check.on, locale, "day")}`}
          </Text>
        </Text>
        <UnbackedEntryList link={link} view={view} />
      </div>
    </Callout>
  );
}

/** The Entries behind the difference, each deletable or keepable here, and what they do not explain. */
function UnbackedEntryList({
  link,
  view,
}: {
  link: BankLinkRow;
  view: BalanceCheckView;
}) {
  const locale = useLocale();
  const describe = useDescribeLedgerEntry();
  const url = useNetWorthUrl();
  const runUndoable = useUndoableMutations();
  const [expanded, setExpanded] = useState(false);
  const olderLabel = t({
    en: "The bank's transactions don't explain the difference: it is older than them, or the bank left a transaction out.",
    zh: "银行的交易记录解释不了这个差额：可能早于银行记录，也可能银行漏了交易。",
  });
  const restOlderLabel = t({
    en: "The bank's transactions don't explain the rest: it is older than them, or the bank left a transaction out.",
    zh: "银行的交易记录解释不了其余差额：可能早于银行记录，也可能银行漏了交易。",
  });
  const missingOutLabel = t({
    en: "The bank counts money out that the ledger doesn't have, such as a charge not yet in the bank's transactions. Add it to the ledger.",
    zh: "银行余额里有账本没有的支出，比如还没出现在银行交易记录里的扣款。请把它记到账本上。",
  });
  const restMissingOutLabel = t({
    en: "The rest is money out that the bank counts and the ledger doesn't have, such as a charge not yet in the bank's transactions. Add it to the ledger.",
    zh: "其余差额是银行算了、账本没有的支出，比如还没出现在银行交易记录里的扣款。请把它记到账本上。",
  });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const deletedLabel = t({ en: "Deleted", zh: "已删除" });
  const keepLabel = t({ en: "Keep", zh: "保留" });

  const showAllLabel = t({ en: "Show all {count}", zh: "显示全部 {count} 笔" });

  const rows = view.unbacked;
  if (rows === null) return null;
  const accountId = link.accountId;
  const shown = expanded ? rows : rows.slice(0, 5);

  return (
    <>
      {rows.length > 0 ? (
        <>
          <Text look="bodySmall" tone="muted" measure="none">
            {t({
              en: "The bank doesn't show these. Delete any that are duplicates, and keep any that are real.",
              zh: "银行没有显示这些交易。重复的请删除，真实的请保留。",
            })}
          </Text>
          <List form="plain">
            {shown.map(({ entry, transaction }) => {
              const description = describe(transaction, accountId);
              const { title } = description;
              return (
                <LedgerEntryLink
                  key={entry.id}
                  transaction={transaction}
                  description={description}
                  amountMinor={entry.amountMinor}
                  currency={link.currency}
                  trailing={displayDay(entry.date, locale, "day")}
                  href={url.hrefOf({
                    account: accountId,
                    tx: transaction.id,
                  })}
                  isSelected={url.tx === transaction.id}
                  actions={
                    <>
                      <Button
                        size="sm"
                        look="ghost"
                        aria-label={`${keepLabel} ${title}, ${displayDay(entry.date, locale, "dayYear")}, ${formatMoney(entry.amountMinor, link.currency, locale, { signDisplay: "exceptZero" })}`}
                        onClick={() => void view.keep(transaction.id)}
                      >
                        {keepLabel}
                      </Button>
                      <Button
                        size="sm"
                        look="ghost"
                        icon={<TrashIcon weight="bold" />}
                        aria-label={`${deleteLabel} ${title}, ${displayDay(entry.date, locale, "dayYear")}, ${formatMoney(entry.amountMinor, link.currency, locale, { signDisplay: "exceptZero" })}`}
                        onClick={() => {
                          runUndoable(
                            [
                              {
                                name: "deleteTransaction",
                                args: { id: transaction.id },
                              },
                            ],
                            { message: deletedLabel },
                          );
                        }}
                      />
                    </>
                  }
                />
              );
            })}
          </List>
          {shown.length < rows.length ? (
            <div>
              <Button
                size="sm"
                look="ghost"
                onClick={() => {
                  setExpanded(true);
                }}
              >
                {showAllLabel.replace(
                  "{count}",
                  new Intl.NumberFormat(locale).format(rows.length),
                )}
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {view.unexplainedMinor === 0 ? null : (
        <Text look="bodySmall" tone="muted" measure="none">
          {view.unexplainedMinor > 0
            ? rows.length > 0
              ? restMissingOutLabel
              : missingOutLabel
            : rows.length > 0
              ? restOlderLabel
              : olderLabel}
        </Text>
      )}
    </>
  );
}

/**
 * The notice on one Transaction of a linked account's Ledger that the bank
 * does not show, with "Keep it" for a real payment the bank left out and
 * "Delete" for a duplicate. Nothing shows where the bank shows it, or where
 * the account's balance agrees with the bank's.
 */
export function UnbackedTransactionNotice({
  accountId,
  transactionId,
  onDeleted,
}: {
  accountId: string;
  transactionId: string;
  onDeleted: () => void;
}) {
  const link = useReplica(
    (snapshot) =>
      liveRowSelectors
        .bankLinks(snapshot)
        .find((candidate) => candidate.accountId === accountId) ?? null,
  );
  if (link === null) return null;
  return (
    <UnbackedTransactionBanner
      link={link}
      transactionId={transactionId}
      onDeleted={onDeleted}
    />
  );
}

function UnbackedTransactionBanner({
  link,
  transactionId,
  onDeleted,
}: {
  link: BankLinkRow;
  transactionId: string;
  onDeleted: () => void;
}) {
  const runUndoable = useUndoableMutations();
  const view = useBalanceCheck(link);
  const deletedLabel = t({ en: "Deleted", zh: "已删除" });
  if (
    !view?.unbacked?.some(({ transaction }) => transaction.id === transactionId)
  ) {
    return null;
  }
  return (
    <Callout
      intent="warning"
      role="status"
      action={
        <>
          <Button size="sm" onClick={() => void view.keep(transactionId)}>
            {t({ en: "Keep it", zh: "保留" })}
          </Button>
          <Button
            size="sm"
            look="ghost"
            icon={<TrashIcon weight="bold" />}
            onClick={() => {
              runUndoable(
                [{ name: "deleteTransaction", args: { id: transactionId } }],
                { message: deletedLabel },
              );
              onDeleted();
            }}
          >
            {t({ en: "Delete", zh: "删除" })}
          </Button>
        </>
      }
    >
      {t({
        en: "The bank did not show this entry. Keep it if it is real, or delete it if it is a duplicate.",
        zh: "银行没有显示这笔交易。真实的请保留，重复的请删除。",
      })}
    </Callout>
  );
}
