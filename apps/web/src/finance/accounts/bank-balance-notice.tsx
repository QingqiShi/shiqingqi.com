"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import type {
  AccountRow,
  BankLinkRow,
  EntryRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import { LedgerEntryLink } from "./ledger-entry-link.tsx";
import { useDescribeLedgerEntry } from "./use-describe-ledger-entry.ts";
import { useUnbackedEntries } from "./use-unbacked-entries.ts";

interface BankBalanceProps {
  link: BankLinkRow;
  account: AccountRow;
}

/**
 * One line on Net worth for a Bank link whose balance disagrees: the account,
 * how far off the bank it is, and how many Entries the bank does not show.
 * It opens the account, where the notice lists them.
 */
export function BankBalanceSummary({
  link,
  account,
  href,
}: BankBalanceProps & { href: string }) {
  const locale = useLocale();
  const gap = useBalanceGap(link, account);
  const unbacked = useUnbackedRows(link, account.id, gap?.ourExcess ?? 0);
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
  if (gap === null) return null;
  const count = unbacked?.rows.length ?? 0;
  const parts = [
    account.name,
    offLabel.replace(
      "{amount}",
      formatMoney(Math.abs(gap.ourExcess), link.currency, locale),
    ),
  ];
  if (count === 1) parts.push(oneLabel);
  if (count > 1) {
    parts.push(
      manyLabel.replace("{count}", new Intl.NumberFormat(locale).format(count)),
    );
  }

  return (
    <div role="status">
      <Link
        href={href}
        {...stylex.props(
          row.tight,
          corner.radius_3,
          transition.colors,
          a11y.focusRing,
          styles.notice,
          styles.summary,
        )}
      >
        <span css={[typeRole.bodySmall, typeModifier.numeric, styles.line]}>
          <strong>{parts[0]}</strong>
          {` · ${parts.slice(1).join(" · ")}`}
        </span>
        <span aria-hidden css={styles.caret}>
          <CaretRightIcon weight="bold" />
        </span>
      </Link>
    </div>
  );
}

/**
 * "Bank says £X · we say £Y", and the Entries no bank row backs, oldest
 * first: each is a payment the bank has not posted yet, or a duplicate to
 * delete here. What they do not explain is older than the bank's records.
 * Our balance comes from the Replica, so the notice goes once the Member
 * deletes the duplicate.
 */
export function BankBalanceNotice({ link, account }: BankBalanceProps) {
  const locale = useLocale();
  const gap = useBalanceGap(link, account);
  if (gap === null) return null;
  const money = (minor: number) => formatMoney(minor, link.currency, locale);

  return (
    <div role="status" css={[corner.radius_3, stack.tight, styles.notice]}>
      <p css={[typeRole.bodySmall, styles.text]}>
        <span css={typeModifier.numeric}>
          {`${t({ en: "Bank says", zh: "银行显示" })} ${money(gap.bank)} · ${t({
            en: "we say",
            zh: "账本显示",
          })} ${money(gap.ours)}`}
        </span>
        {link.bankBalanceOn === null ? null : (
          <span css={styles.muted}>
            {` · ${displayDay(link.bankBalanceOn, locale, "day")}`}
          </span>
        )}
      </p>
      <UnbackedEntryList
        link={link}
        accountId={account.id}
        ourExcess={gap.ourExcess}
      />
    </div>
  );
}

/** The Entries behind the difference, each deletable here, and what they do not explain. */
function UnbackedEntryList({
  link,
  accountId,
  ourExcess,
}: {
  link: BankLinkRow;
  accountId: string;
  /** Our balance minus the bank's. */
  ourExcess: number;
}) {
  const locale = useLocale();
  const describe = useDescribeLedgerEntry();
  const runUndoable = useUndoableMutations();
  const [expanded, setExpanded] = useState(false);
  const unbacked = useUnbackedRows(link, accountId, ourExcess);
  const olderLabel = t({
    en: "The difference is older than the bank's records. Check the opening balance.",
    zh: "差额早于银行记录，请检查期初余额。",
  });
  const restOlderLabel = t({
    en: "The rest is older than the bank's records. Check the opening balance.",
    zh: "其余差额早于银行记录，请检查期初余额。",
  });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const deletedLabel = t({ en: "Deleted", zh: "已删除" });
  const showAllLabel = t({ en: "Show all {count}", zh: "显示全部 {count} 笔" });

  if (unbacked === null) return null;
  const { rows, explained } = unbacked;
  const shown = expanded ? rows : rows.slice(0, 5);

  return (
    <>
      {rows.length > 0 ? (
        <>
          <p css={[typeRole.bodySmall, styles.muted]}>
            {t({
              en: "The bank doesn't show these yet. Delete any that are duplicates.",
              zh: "银行还没有显示这些交易。如有重复，请删除。",
            })}
          </p>
          <ul css={styles.list}>
            {shown.map(({ entry, transaction }) => {
              const description = describe(transaction, accountId);
              const { title } = description;
              return (
                <li key={entry.id} css={row.tight}>
                  <div css={styles.entry}>
                    <LedgerEntryLink
                      transaction={transaction}
                      description={description}
                      amountMinor={entry.amountMinor}
                      currency={link.currency}
                      trailing={displayDay(entry.date, locale, "day")}
                    />
                  </div>
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
                </li>
              );
            })}
          </ul>
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
      {explained === ourExcess ? null : (
        <p css={[typeRole.bodySmall, styles.muted]}>
          {rows.length > 0 ? restOlderLabel : olderLabel}
        </p>
      )}
    </>
  );
}

/** The bank's balance and ours on the day the bank gave it, or null when they agree. */
function useBalanceGap(link: BankLinkRow, account: AccountRow) {
  const ours = useReplica((snapshot) =>
    link.bankBalanceOn === null
      ? 0
      : accountBalanceAt(
          account,
          selectBalanceSeriesByAccount(snapshot).get(account.id),
          link.bankBalanceOn,
        ),
  );
  const bank = link.bankBalanceMinor;
  if (link.balanceDifferenceMinor === null || bank === null || bank === ours) {
    return null;
  }
  return { bank, ours, ourExcess: ours - bank };
}

/** The Entries behind the difference that are still in the account's posted Ledger, and their sum; null while the server reads them. */
function useUnbackedRows(
  link: BankLinkRow,
  accountId: string,
  ourExcess: number,
) {
  const entryRows = useReplica((snapshot) => snapshot.tables.entries);
  const transactionRows = useReplica(
    (snapshot) => snapshot.tables.transactions,
  );
  const unbacked = useUnbackedEntries(
    link.id,
    `${String(link.version)}:${String(ourExcess)}`,
  );
  if (unbacked.state !== "ready") return null;
  const rows = unbacked.entryIds.flatMap((id) => {
    const entry = entryRows.get(id);
    const transaction = entry && transactionRows.get(entry.transactionId);
    return entry &&
      transaction &&
      isUnbackedStill(entry, transaction, accountId)
      ? [{ entry, transaction }]
      : [];
  });
  const explained = rows.reduce((sum, row) => sum + row.entry.amountMinor, 0);
  return { rows, explained };
}

/** The server read the list before the last local change: an Entry that left the account's posted Ledger since is no longer behind the difference. */
function isUnbackedStill(
  entry: EntryRow,
  transaction: TransactionRow,
  accountId: string,
) {
  return (
    entry.deletedAt === null &&
    entry.accountId === accountId &&
    transaction.deletedAt === null &&
    transaction.status === "posted"
  );
}

const styles = stylex.create({
  notice: {
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.borderWarning,
    backgroundColor: color.bgWarningSubtle,
  },
  summary: {
    color: color.fg,
    textDecoration: "none",
    backgroundImage: {
      default: "none",
      ":hover": {
        default: null,
        [pointer.canHover]: `linear-gradient(${color.bgWarningSubtle}, ${color.bgWarningSubtle})`,
      },
    },
  },
  line: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  caret: {
    display: "flex",
    flexShrink: 0,
    color: color.fgMuted,
  },
  text: {
    margin: 0,
    color: color.fg,
  },
  muted: {
    margin: 0,
    color: color.fgMuted,
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  entry: {
    flexGrow: 1,
    minInlineSize: 0,
  },
});
