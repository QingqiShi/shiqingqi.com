import {
  and,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  isNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { toMinorUnits } from "../../domain/money/to-minor-units.ts";
import {
  accounts,
  bankTransactions,
  entries,
  members,
  payees,
  tags,
  transactions,
  transactionTags,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

export const SEARCH_LIMIT = { default: 20, max: 50 };

export interface TransactionSearch {
  /** Every word must appear in the bank text, the Payee name or the note. */
  text?: string;
  accountId?: string;
  /** Absolute, in major units of the Entry's currency. */
  amountMin?: number;
  amountMax?: number;
  dateFrom?: string;
  dateTo?: string;
  kind?: "expense" | "income" | "transfer";
  limit?: number;
}

export interface FoundTransaction {
  id: string;
  date: string;
  kind: "expense" | "income" | "transfer";
  entries: {
    accountId: string;
    accountName: string;
    amountMinor: number;
    currency: string;
  }[];
  /** What the bank said: the merchant and description of each bank row. */
  bankTexts: string[];
  payeeId: string | null;
  payeeName: string | null;
  categoryId: string | null;
  tagNames: string[];
  memberName: string | null;
  note: string;
}

function likePattern(word: string) {
  return `%${word.replaceAll(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

function textMatches(scope: RepositoryScope, word: string): SQL | undefined {
  const pattern = likePattern(word);
  return or(
    ilike(transactions.note, pattern),
    exists(
      scope.db
        .select({ id: payees.id })
        .from(payees)
        .where(
          and(
            eq(payees.householdId, scope.householdId),
            eq(payees.id, transactions.payeeId),
            ilike(payees.name, pattern),
          ),
        ),
    ),
    exists(
      scope.db
        .select({ id: bankTransactions.id })
        .from(bankTransactions)
        .where(
          and(
            eq(bankTransactions.householdId, scope.householdId),
            eq(bankTransactions.transactionId, transactions.id),
            or(
              ilike(bankTransactions.merchant, pattern),
              ilike(bankTransactions.description, pattern),
            ),
          ),
        ),
    ),
  );
}

async function amountMatches(
  scope: RepositoryScope,
  search: TransactionSearch,
): Promise<SQL | undefined> {
  if (search.amountMin === undefined && search.amountMax === undefined) {
    return undefined;
  }
  const currencies = await scope.db
    .selectDistinct({ currency: accounts.currency })
    .from(accounts)
    .where(eq(accounts.householdId, scope.householdId));
  const size = sql`abs(${entries.amountMinor})`;
  return or(
    ...currencies.map(({ currency }) =>
      and(
        eq(accounts.currency, currency),
        search.amountMin === undefined
          ? undefined
          : sql`${size} >= ${toMinorUnits(search.amountMin, currency)}`,
        search.amountMax === undefined
          ? undefined
          : sql`${size} <= ${toMinorUnits(search.amountMax, currency)}`,
      ),
    ),
  );
}

async function entryMatches(scope: RepositoryScope, search: TransactionSearch) {
  const amount = await amountMatches(scope, search);
  if (search.accountId === undefined && amount === undefined) return undefined;
  return exists(
    scope.db
      .select({ id: entries.id })
      .from(entries)
      .innerJoin(
        accounts,
        and(
          eq(accounts.householdId, scope.householdId),
          eq(accounts.id, entries.accountId),
        ),
      )
      .where(
        and(
          eq(entries.householdId, scope.householdId),
          eq(entries.transactionId, transactions.id),
          isNull(entries.deletedAt),
          search.accountId === undefined
            ? undefined
            : eq(entries.accountId, search.accountId),
          amount,
        ),
      ),
  );
}

function group<Row extends { transactionId: string }>(rows: readonly Row[]) {
  return Map.groupBy(rows, (row) => row.transactionId);
}

export const transactionSearchRepository = {
  /**
   * Live posted Transactions that a Member labelled and that are not in
   * Review, filtered by `search`, the newest first.
   */
  async search(
    scope: RepositoryScope,
    search: TransactionSearch,
  ): Promise<FoundTransaction[]> {
    const { db, householdId } = scope;
    const words = (search.text ?? "").split(/\s+/).filter(Boolean);
    const limit = Math.min(
      Math.max(search.limit ?? SEARCH_LIMIT.default, 1),
      SEARCH_LIMIT.max,
    );
    const found = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        kind: transactions.kind,
        payeeId: transactions.payeeId,
        payeeName: payees.name,
        categoryId: transactions.categoryId,
        memberName: members.name,
        note: transactions.note,
      })
      .from(transactions)
      .leftJoin(
        payees,
        and(
          eq(payees.householdId, householdId),
          eq(payees.id, transactions.payeeId),
        ),
      )
      .leftJoin(
        members,
        and(
          eq(members.householdId, householdId),
          eq(members.id, transactions.memberId),
        ),
      )
      .where(
        and(
          eq(transactions.householdId, householdId),
          isNull(transactions.deletedAt),
          eq(transactions.status, "posted"),
          eq(transactions.needsReview, false),
          eq(transactions.labelledBy, "member"),
          search.kind === undefined
            ? undefined
            : eq(transactions.kind, search.kind),
          search.dateFrom === undefined
            ? undefined
            : gte(transactions.date, search.dateFrom),
          search.dateTo === undefined
            ? undefined
            : lte(transactions.date, search.dateTo),
          ...words.map((word) => textMatches(scope, word)),
          await entryMatches(scope, search),
        ),
      )
      .orderBy(
        desc(transactions.date),
        desc(transactions.createdAt),
        desc(transactions.id),
      )
      .limit(limit);
    if (found.length === 0) return [];
    const ids = found.map((row) => row.id);

    const entryRows = await db
      .select({
        transactionId: entries.transactionId,
        accountId: entries.accountId,
        accountName: accounts.name,
        amountMinor: entries.amountMinor,
        currency: accounts.currency,
      })
      .from(entries)
      .innerJoin(
        accounts,
        and(
          eq(accounts.householdId, householdId),
          eq(accounts.id, entries.accountId),
        ),
      )
      .where(
        and(
          eq(entries.householdId, householdId),
          inArray(entries.transactionId, ids),
          isNull(entries.deletedAt),
        ),
      )
      .orderBy(entries.position);
    const bankRows = await db
      .select({
        transactionId: sql<string>`${bankTransactions.transactionId}`,
        merchant: bankTransactions.merchant,
        description: bankTransactions.description,
      })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.householdId, householdId),
          inArray(bankTransactions.transactionId, ids),
        ),
      )
      .orderBy(bankTransactions.date, bankTransactions.providerTxId);
    const tagRows = await db
      .select({
        transactionId: transactionTags.transactionId,
        name: tags.name,
      })
      .from(transactionTags)
      .innerJoin(
        tags,
        and(
          eq(tags.householdId, householdId),
          eq(tags.id, transactionTags.tagId),
        ),
      )
      .where(
        and(
          eq(transactionTags.householdId, householdId),
          inArray(transactionTags.transactionId, ids),
          isNull(transactionTags.deletedAt),
        ),
      )
      .orderBy(tags.position, tags.name);

    const entriesOf = group(entryRows);
    const bankOf = group(bankRows);
    const tagsOf = group(tagRows);
    return found.map((row) => ({
      ...row,
      entries: (entriesOf.get(row.id) ?? []).map(
        ({ transactionId: _, ...entry }) => entry,
      ),
      bankTexts: (bankOf.get(row.id) ?? []).map((bank) =>
        [bank.merchant, bank.description].filter(Boolean).join(" | "),
      ),
      tagNames: (tagsOf.get(row.id) ?? []).map((tag) => tag.name),
    }));
  },
};
