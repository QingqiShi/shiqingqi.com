"use client";

import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import Link from "next/link";
import { useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import { useCategoryDisplayName } from "../store/use-category-display-name.ts";
import type {
  AccountRow,
  TransactionRow,
  ValuationRow,
} from "../sync/row-schemas.ts";
import { ledgerRunningBalances } from "./ledger-running-balances.ts";

type LedgerItem =
  | { type: "valuation"; day: string; valuation: ValuationRow }
  | { type: "entry"; day: string; transaction: TransactionRow; amount: number };

const PAGE = 30;

function valuationsOf(
  rows: ReadonlyMap<string, ValuationRow>,
  accountId: string,
): ValuationRow[] {
  const list: ValuationRow[] = [];
  for (const valuation of rows.values()) {
    if (valuation.accountId === accountId && valuation.deletedAt === null) {
      list.push(valuation);
    }
  }
  return list.sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
}

/**
 * The newest Valuations and Entries of one account, interleaved by day, each
 * with the balance after it: a Valuation is the balance at the end of its
 * day, so it leads its day. The whole history is in the Transactions list,
 * filtered to the account.
 */
export function AccountLedger({ account }: { account: AccountRow }) {
  const locale = useLocale();
  const runUndoable = useUndoableMutations();
  const categoryName = useCategoryDisplayName();
  const [limit, setLimit] = useState(PAGE);
  const valuationRows = useReplica((snapshot) => snapshot.tables.valuations);
  const transactions = useReplica(
    (snapshot) => selectTransactionsByAccount(snapshot).get(account.id) ?? null,
  );
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const payees = useReplica((snapshot) => snapshot.tables.payees);
  const categories = useReplica((snapshot) => snapshot.tables.categories);
  const series = useReplica((snapshot) =>
    selectBalanceSeriesByAccount(snapshot).get(account.id),
  );

  const valuations = valuationsOf(valuationRows, account.id);
  const items: LedgerItem[] = [];
  let v = 0;
  let e = 0;
  const list = transactions ?? [];
  while (items.length < limit && (v < valuations.length || e < list.length)) {
    const valuation = valuations.at(v);
    const transaction = list.at(e);
    if (valuation && (!transaction || valuation.on >= transaction.date)) {
      items.push({ type: "valuation", day: valuation.on, valuation });
      v++;
    } else if (transaction) {
      const amount = (entriesByTransaction.get(transaction.id) ?? [])
        .filter((entry) => entry.accountId === account.id)
        .reduce((sum, entry) => sum + entry.amountMinor, 0);
      items.push({ type: "entry", day: transaction.date, transaction, amount });
      e++;
    }
  }
  const hasMore = v < valuations.length || e < list.length;
  const balancesAfter = ledgerRunningBalances(
    items.map((item) =>
      item.type === "valuation"
        ? { day: item.day, valuationMinor: item.valuation.amountMinor }
        : {
            day: item.day,
            entry: {
              amountMinor: item.amount,
              counts: item.transaction.status === "posted",
            },
          },
    ),
    (day) => accountBalanceAt(account, series, day),
  );

  const sourceLabels: Record<ValuationRow["source"], string> = {
    manual: t({ en: "Balance set", zh: "余额记录" }),
    import: t({ en: "Imported balance", zh: "导入的余额" }),
    bank: t({ en: "Bank balance", zh: "银行余额" }),
  };
  const kindLabels: Record<TransactionRow["kind"], string> = {
    expense: t({ en: "Expense", zh: "支出" }),
    income: t({ en: "Income", zh: "收入" }),
    transfer: t({ en: "Transfer", zh: "转账" }),
  };
  const removeLabel = t({ en: "Remove the balance of", zh: "删除余额记录：" });
  const removedLabel = t({ en: "Balance removed", zh: "余额记录已删除" });
  const afterLabel = t({ en: "Balance after:", zh: "变动后余额：" });
  const expectedLabel = t({ en: "Expected", zh: "待确认" });

  const titleOf = (transaction: TransactionRow) => {
    const payee =
      transaction.payeeId === null
        ? undefined
        : payees.get(transaction.payeeId);
    if (payee) return payee.name;
    const category =
      transaction.categoryId === null
        ? undefined
        : categories.get(transaction.categoryId);
    if (category) return categoryName(category);
    return transaction.note || kindLabels[transaction.kind];
  };

  return (
    <section css={stack.item} aria-label={t({ en: "Ledger", zh: "明细" })}>
      {items.length === 0 ? (
        <p css={[typeRole.bodySmall, styles.muted]}>
          {t({
            en: "Nothing recorded on this account yet.",
            zh: "这个账户还没有记录。",
          })}
        </p>
      ) : (
        <ol css={styles.list}>
          {items.map((item, index) =>
            item.type === "valuation" ? (
              <li key={`v:${item.valuation.id}`} css={[row.tight, styles.item]}>
                <span
                  css={[typeRole.caption, typeModifier.numeric, styles.day]}
                >
                  {displayDay(item.day, locale, "day")}
                </span>
                <span css={[typeRole.bodySmall, styles.title]}>
                  {sourceLabels[item.valuation.source]}
                </span>
                <span
                  css={[
                    typeRole.bodySmall,
                    typeModifier.numeric,
                    styles.amount,
                  ]}
                >
                  {`= ${formatMoney(item.valuation.amountMinor, account.currency, locale)}`}
                </span>
                <Button
                  size="sm"
                  look="ghost"
                  icon={<TrashIcon weight="bold" />}
                  aria-label={`${removeLabel} ${displayDay(item.day, locale, "dayYear")}`}
                  onClick={() => {
                    runUndoable(
                      [
                        {
                          name: "deleteValuation",
                          args: { id: item.valuation.id },
                        },
                      ],
                      { message: removedLabel },
                    );
                  }}
                />
              </li>
            ) : (
              <li key={`e:${item.transaction.id}`}>
                <Link
                  href={getLocalePath(
                    `/finance/transactions?id=${item.transaction.id}`,
                    locale,
                  )}
                  {...stylex.props(
                    row.tight,
                    corner.radius_2,
                    transition.colors,
                    a11y.focusRing,
                    styles.item,
                    styles.link,
                  )}
                >
                  <span
                    css={[typeRole.caption, typeModifier.numeric, styles.day]}
                  >
                    {displayDay(item.day, locale, "day")}
                  </span>
                  <span css={[typeRole.bodySmall, styles.title]}>
                    {titleOf(item.transaction)}
                  </span>
                  {item.transaction.status === "expected" ? (
                    <Badge size="sm" intent="info">
                      {expectedLabel}
                    </Badge>
                  ) : null}
                  <span css={styles.amounts}>
                    <span
                      css={[
                        typeRole.bodySmall,
                        typeModifier.numeric,
                        styles.amount,
                      ]}
                    >
                      {formatMoney(item.amount, account.currency, locale, {
                        signDisplay: "exceptZero",
                      })}
                    </span>
                    {balancesAfter[index] == null ? null : (
                      <span
                        css={[
                          typeRole.caption,
                          typeModifier.numeric,
                          styles.after,
                        ]}
                      >
                        <span css={a11y.srOnly}>{afterLabel} </span>
                        {formatMoney(
                          balancesAfter[index],
                          account.currency,
                          locale,
                        )}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ),
          )}
        </ol>
      )}
      <div css={row.tight}>
        {hasMore ? (
          <Button
            size="sm"
            look="ghost"
            onClick={() => {
              setLimit(limit + PAGE);
            }}
          >
            {t({ en: "Show more", zh: "显示更多" })}
          </Button>
        ) : null}
        <Link
          href={getLocalePath(
            `/finance/transactions?account=${account.id}`,
            locale,
          )}
          {...stylex.props(
            typeRole.bodySmall,
            corner.radius_1,
            a11y.focusRing,
            styles.all,
          )}
        >
          {t({
            en: "All transactions on this account",
            zh: "此账户的全部交易",
          })}
        </Link>
      </div>
    </section>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  item: {
    minBlockSize: space._7,
    paddingInline: space._1,
    gap: rhythm.tight,
  },
  link: {
    color: color.fg,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
  day: {
    flexShrink: 0,
    minInlineSize: "4.5em",
    whiteSpace: "nowrap",
    color: color.fgMuted,
  },
  title: {
    flexGrow: 1,
    minInlineSize: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  amount: {
    flexShrink: 0,
    fontWeight: font.weight_5,
  },
  amounts: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    flexShrink: 0,
  },
  after: {
    color: color.fgMuted,
  },
  muted: {
    margin: 0,
    color: color.fgMuted,
  },
  all: {
    color: color.fgAccent,
  },
});
