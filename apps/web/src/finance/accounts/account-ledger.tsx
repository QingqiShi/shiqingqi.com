"use client";

import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { ScalesIcon } from "@phosphor-icons/react/dist/ssr/Scales";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { buttonTokens } from "@tuja/ui/components/button.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { type ReactNode, useState } from "react";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { Link } from "#src/links/link.tsx";
import { accountBalanceAt } from "../domain/balance/net-worth-at.ts";
import { displayDay } from "../domain/dates/display-day.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import { useReplica } from "../replica/use-replica.ts";
import { useUndoableMutations } from "../shell/use-undoable-mutations.ts";
import { selectBalanceSeriesByAccount } from "../store/select-balance-series-by-account.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTransactionsByAccount } from "../store/select-transactions-by-account.ts";
import type { AccountRow, ValuationRow } from "../sync/row-schemas.ts";
import { DayHeader } from "../transactions/day-header.tsx";
import { DayTotals } from "../transactions/day-totals.tsx";
import { TransactionFace } from "../transactions/transaction-face.tsx";
import { UpcomingHeader } from "../transactions/upcoming-header.tsx";
import {
  buildAccountLedger,
  type LedgerEntryItem,
} from "./build-account-ledger.ts";
import { LedgerEntryLink } from "./ledger-entry-link.tsx";
import { useDescribeLedgerEntry } from "./use-describe-ledger-entry.ts";

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

interface AccountLedgerProps {
  account: AccountRow;
  today: string;
  dayHeadingLevel: 3 | 4;
}

export function AccountLedger({
  account,
  today,
  dayHeadingLevel,
}: AccountLedgerProps) {
  const locale = useLocale();
  const runUndoable = useUndoableMutations();
  const describe = useDescribeLedgerEntry();
  const [limit, setLimit] = useState(PAGE);
  const [comingUpOpen, setComingUpOpen] = useState(false);
  const valuationRows = useReplica((snapshot) => snapshot.tables.valuations);
  const transactions = useReplica(
    (snapshot) => selectTransactionsByAccount(snapshot).get(account.id) ?? null,
  );
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const series = useReplica((snapshot) =>
    selectBalanceSeriesByAccount(snapshot).get(account.id),
  );

  const ledger = buildAccountLedger({
    valuations: valuationsOf(valuationRows, account.id),
    transactions: transactions ?? [],
    amountOf: (transaction) =>
      (entriesByTransaction.get(transaction.id) ?? [])
        .filter((entry) => entry.accountId === account.id)
        .reduce((sum, entry) => sum + entry.amountMinor, 0),
    today,
    limit,
    balanceAt: (day) => accountBalanceAt(account, series, day),
  });

  const money = (minor: number) => formatMoney(minor, account.currency, locale);
  const sourceLabels: Record<ValuationRow["source"], string> = {
    manual: t({ en: "Balance set", zh: "余额记录" }),
    import: t({ en: "Imported balance", zh: "导入的余额" }),
    bank: t({ en: "Bank balance", zh: "银行余额" }),
  };
  const firstValuationCaption = t({
    en: "First recorded balance",
    zh: "首次记录的余额",
  });
  const noChangeCaption = t({ en: "No change", zh: "无变动" });
  const changeLabel = t({ en: "Change", zh: "变动" });
  const valuationCaption = (changeMinor: number | null) =>
    changeMinor === null
      ? firstValuationCaption
      : changeMinor === 0
        ? noChangeCaption
        : `${changeLabel} ${formatMoney(changeMinor, account.currency, locale, { signDisplay: "exceptZero" })}`;
  const afterLabel = t({ en: "Balance after:", zh: "变动后余额：" });
  const removeLabel = t({ en: "Remove the balance of", zh: "删除余额记录：" });
  const removedLabel = t({ en: "Balance removed", zh: "余额记录已删除" });

  const entryLink = (item: LedgerEntryItem, trailing: ReactNode) => (
    <li key={`e:${item.transaction.id}`}>
      <LedgerEntryLink
        transaction={item.transaction}
        description={describe(item.transaction, account.id)}
        amountMinor={item.amountMinor}
        currency={account.currency}
        trailing={trailing}
      />
    </li>
  );

  const isEmpty = ledger.comingUp.length === 0 && ledger.days.length === 0;

  return (
    <section css={stack.item} aria-label={t({ en: "Ledger", zh: "明细" })}>
      {isEmpty ? (
        <p css={[typeRole.bodySmall, styles.muted]}>
          {t({
            en: "Nothing recorded on this account yet.",
            zh: "这个账户还没有记录。",
          })}
        </p>
      ) : (
        <div>
          {ledger.comingUp.length > 0 ? (
            <div css={styles.comingUp}>
              <UpcomingHeader
                count={ledger.comingUp.length}
                totalMinor={ledger.comingUpMinor}
                open={comingUpOpen}
                currency={account.currency}
                locale={locale}
                onToggle={() => {
                  setComingUpOpen(!comingUpOpen);
                }}
              />
              {comingUpOpen ? (
                <ol css={[styles.list, styles.comingUpList]}>
                  {ledger.comingUp.map((item) =>
                    entryLink(item, displayDay(item.day, locale, "weekday")),
                  )}
                </ol>
              ) : null}
            </div>
          ) : null}
          {ledger.days.map((day) => (
            <div key={day.day}>
              <DayHeader
                day={day.day}
                today={today}
                locale={locale}
                level={dayHeadingLevel}
              >
                <DayTotals
                  expenseMinor={day.expenseMinor}
                  incomeMinor={day.incomeMinor}
                  currency={account.currency}
                  locale={locale}
                />
              </DayHeader>
              <ol css={[styles.list, styles.dayList]}>
                {day.items.map((item) =>
                  item.type === "valuation" ? (
                    <li key={`v:${item.valuation.id}`}>
                      <TransactionFace
                        icon={<ScalesIcon weight="bold" />}
                        title={sourceLabels[item.valuation.source]}
                        subtitle={valuationCaption(item.changeMinor)}
                        amount={money(item.valuation.amountMinor)}
                        trailing={
                          <Button
                            size="sm"
                            look="ghost"
                            icon={<TrashIcon weight="bold" />}
                            aria-label={`${removeLabel} ${displayDay(item.day, locale, "dayYear")}`}
                            css={styles.remove}
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
                        }
                      />
                    </li>
                  ) : (
                    entryLink(
                      item,
                      item.balanceAfter === null ? null : (
                        <>
                          <span css={a11y.srOnly}>{`${afterLabel} `}</span>
                          {money(item.balanceAfter)}
                        </>
                      ),
                    )
                  ),
                )}
              </ol>
            </div>
          ))}
        </div>
      )}
      <div css={stack.tight}>
        {ledger.hasMore ? (
          <Button
            look="ghost"
            css={styles.more}
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
            flex.between,
            typeRole.bodySmall,
            corner.radius_3,
            transition.colors,
            a11y.focusRingInset,
            styles.all,
          )}
        >
          {t({
            en: "All transactions on this account",
            zh: "此账户的全部交易",
          })}
          <CaretRightIcon weight="bold" aria-hidden />
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
  comingUp: {
    paddingBlockEnd: space._1,
  },
  comingUpList: {
    paddingBlockStart: space._1,
  },
  dayList: {
    paddingBlockStart: space._0,
  },
  remove: {
    [buttonTokens.height]: `calc(${font.uiBodySmall} * ${font.lineHeight_4} + ${space._00} * 2)`,
    marginBlock: `calc(${space._00} * -1)`,
    [buttonTokens.color]: color.fgMuted,
  },
  muted: {
    margin: 0,
    color: color.fgMuted,
  },
  more: {
    inlineSize: "100%",
  },
  all: {
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._2,
    color: color.fgMuted,
    textDecoration: "none",
    backgroundColor: {
      default: "transparent",
      ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
    },
  },
});
