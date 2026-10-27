"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { SplitViewLink } from "@tuja/ui/components/navigation-split-view";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
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
    <div role="status">
      <SplitViewLink
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
      </SplitViewLink>
    </div>
  );
}

/**
 * "Bank says £X · we say £Y", and the Entries no bank row backs, oldest
 * first: each is a payment the bank has not posted yet, a duplicate to
 * delete here, or a real payment the bank left out, to keep here. What they
 * do not explain is older than the bank's records, or the bank left it out.
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
    <div role="status" css={[corner.radius_3, stack.tight, styles.notice]}>
      <p css={[typeRole.bodySmall, styles.text]}>
        <span css={typeModifier.numeric}>
          {`${bankSaysLabel} ${money(check.bankMinor)} · ${weSayLabel} ${money(check.oursMinor)}`}
        </span>
        <span css={styles.muted}>
          {` · ${displayDay(check.on, locale, "day")}`}
        </span>
      </p>
      <UnbackedEntryList link={link} view={view} />
    </div>
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
          <p css={[typeRole.bodySmall, styles.muted]}>
            {t({
              en: "The bank doesn't show these. Delete any that are duplicates, and keep any that are real.",
              zh: "银行没有显示这些交易。重复的请删除，真实的请保留。",
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
                      href={url.hrefOf({
                        account: accountId,
                        tx: transaction.id,
                      })}
                      isSelected={url.tx === transaction.id}
                    />
                  </div>
                  <Button
                    size="sm"
                    look="ghost"
                    css={styles.keep}
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
      {view.unexplainedMinor === 0 ? null : (
        <p css={[typeRole.bodySmall, styles.muted]}>
          {rows.length > 0 ? restOlderLabel : olderLabel}
        </p>
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
    <div role="status" css={[corner.radius_3, stack.tight, styles.notice]}>
      <p css={[typeRole.bodySmall, styles.text]}>
        {t({
          en: "The bank did not show this entry. Keep it if it is real, or delete it if it is a duplicate.",
          zh: "银行没有显示这笔交易。真实的请保留，重复的请删除。",
        })}
      </p>
      <div css={row.tight}>
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
      </div>
    </div>
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
    paddingBlock: space._1,
    paddingInline: space._2,
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
  keep: {
    flexShrink: 0,
  },
});
