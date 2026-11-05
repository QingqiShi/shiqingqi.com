import type {
  entries,
  transactions,
  transactionTags,
  valuations,
} from "../../db/schema.ts";
import type { SyntheticContext } from "./create-synthetic-context.ts";

type Row<T extends { $inferInsert: object }> = T["$inferInsert"];

export function monthKey(day: string) {
  return day.slice(0, 7);
}

interface NewTransaction {
  id?: string;
  kind: "expense" | "income" | "transfer";
  status?: "posted" | "expected";
  date: string;
  categoryId: string | null;
  payeeId?: string | null;
  memberId?: string | null;
  ruleId?: string | null;
  refundOfId?: string | null;
  note?: string;
  source?: "manual" | "rule" | "bank";
  needsReview?: boolean;
  labelledBy?: "member" | "ai";
  aiReason?: string | null;
  entries: { account: string; amountMinor: number; id?: string }[];
  tagIds?: string[];
  /** A repayment or a claim: it pays off the month's charges and is not one itself. */
  settles?: boolean;
}

export function createSyntheticLedger({
  id,
  version,
  householdId,
  stamp,
  accountId,
}: SyntheticContext) {
  const transactionRows: Row<typeof transactions>[] = [];
  const entryRows: Row<typeof entries>[] = [];
  const transactionTagRows: Row<typeof transactionTags>[] = [];
  const countByMonth = new Map<string, number>();
  const postedByMonthAndAccount = new Map<string, number>();
  const settledByMonthAndAccount = new Map<string, number>();
  const postedByAccount = new Map<string, number>();
  let transactionCounter = 0;

  const addToMap = (map: Map<string, number>, key: string, amount: number) => {
    map.set(key, (map.get(key) ?? 0) + amount);
  };
  const chargedIn = (account: string, month: string) =>
    (postedByMonthAndAccount.get(`${account}|${month}`) ?? 0) -
    (settledByMonthAndAccount.get(`${account}|${month}`) ?? 0);

  function add(transaction: NewTransaction) {
    const transactionId =
      transaction.id ?? id("transaction", transactionCounter++);
    const status = transaction.status ?? "posted";
    const createdAt = stamp(transaction.date);
    transactionRows.push({
      id: transactionId,
      householdId,
      kind: transaction.kind,
      status,
      date: transaction.date,
      categoryId: transaction.categoryId,
      payeeId: transaction.payeeId ?? null,
      memberId: transaction.memberId ?? null,
      ruleId: transaction.ruleId ?? null,
      refundOfId: transaction.refundOfId ?? null,
      note: transaction.note ?? "",
      source: transaction.source ?? "manual",
      needsReview: transaction.needsReview ?? false,
      labelledBy: transaction.labelledBy ?? "member",
      aiReason: transaction.aiReason ?? null,
      version,
      createdAt,
      updatedAt: createdAt,
    });
    transaction.entries.forEach((entry, position) => {
      entryRows.push({
        id: entry.id ?? id("entry", transactionId, position),
        householdId,
        transactionId,
        accountId: accountId(entry.account),
        date: transaction.date,
        amountMinor: entry.amountMinor,
        position,
        version,
        createdAt,
        updatedAt: createdAt,
      });
      if (status === "posted") {
        addToMap(
          postedByMonthAndAccount,
          `${entry.account}|${monthKey(transaction.date)}`,
          entry.amountMinor,
        );
        addToMap(postedByAccount, entry.account, entry.amountMinor);
        if (transaction.settles) {
          addToMap(
            settledByMonthAndAccount,
            `${entry.account}|${monthKey(transaction.date)}`,
            entry.amountMinor,
          );
        }
      }
    });
    for (const tag of new Set(transaction.tagIds ?? [])) {
      transactionTagRows.push({
        transactionId,
        tagId: tag,
        householdId,
        version,
      });
    }
    addToMap(countByMonth, monthKey(transaction.date), 1);
    return transactionId;
  }

  const valuationRows: Row<typeof valuations>[] = [];
  const valuationState = new Map<string, number>();
  const addValuation = (account: string, on: string, amountMinor: number) => {
    const createdAt = stamp(on);
    valuationRows.push({
      id: id("valuation", account, on),
      householdId,
      accountId: accountId(account),
      on,
      amountMinor,
      source: "manual",
      version,
      createdAt,
      updatedAt: createdAt,
    });
  };

  return {
    transactionRows,
    entryRows,
    transactionTagRows,
    valuationRows,
    valuationState,
    countByMonth,
    postedByAccount,
    chargedIn,
    add,
    addValuation,
  };
}

export type SyntheticLedger = ReturnType<typeof createSyntheticLedger>;
