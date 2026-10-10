import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { LabelMemory, MemoryTransaction } from "../../ai/types.ts";
import {
  accounts,
  categories,
  entries,
  households,
  members,
  payeeAliases,
  payees,
  tags,
  transactions,
  transactionTags,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

const DEFAULT_TRANSACTION_LIMIT = 3000;

function group(rows: { key: string; value: string }[]) {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const list = grouped.get(row.key);
    if (list) list.push(row.value);
    else grouped.set(row.key, [row.value]);
  }
  return grouped;
}

export const labelMemoryRepository = {
  /** What the labelling pipeline knows about the Household: Payees, aliases, taxonomy and recent posted Transactions. */
  async load(
    scope: RepositoryScope,
    transactionLimit = DEFAULT_TRANSACTION_LIMIT,
  ): Promise<LabelMemory> {
    const { db, householdId } = scope;
    const newestFirst = [
      desc(transactions.date),
      desc(transactions.createdAt),
      desc(transactions.id),
    ];
    const recentIds = db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          isNull(transactions.deletedAt),
          eq(transactions.status, "posted"),
        ),
      )
      .orderBy(...newestFirst)
      .limit(transactionLimit);

    const [
      household,
      aliasRows,
      payeeRows,
      categoryRows,
      tagRows,
      memberRows,
      accountRows,
      transactionRows,
      tagLinks,
      entryLinks,
    ] = await Promise.all([
      db
        .select({ baseCurrency: households.baseCurrency })
        .from(households)
        .where(eq(households.id, householdId)),
      db
        .select({ alias: payeeAliases.alias, payeeId: payeeAliases.payeeId })
        .from(payeeAliases)
        .where(eq(payeeAliases.householdId, householdId)),
      db
        .select({
          id: payees.id,
          name: payees.name,
          defaultCategoryId: payees.defaultCategoryId,
        })
        .from(payees)
        .where(
          and(
            eq(payees.householdId, householdId),
            isNull(payees.deletedAt),
            isNull(payees.mergedIntoId),
          ),
        )
        .orderBy(payees.name),
      db
        .select({
          id: categories.id,
          parentId: categories.parentId,
          kind: categories.kind,
          name: categories.name,
        })
        .from(categories)
        .where(
          and(
            eq(categories.householdId, householdId),
            isNull(categories.deletedAt),
            isNull(categories.archivedAt),
          ),
        )
        .orderBy(categories.kind, categories.position, categories.name),
      db
        .select({ id: tags.id, name: tags.name })
        .from(tags)
        .where(and(eq(tags.householdId, householdId), isNull(tags.deletedAt)))
        .orderBy(tags.position, tags.name),
      db
        .select({ id: members.id, name: members.name })
        .from(members)
        .where(
          and(eq(members.householdId, householdId), isNull(members.deletedAt)),
        ),
      db
        .select({
          id: accounts.id,
          name: accounts.name,
          kind: accounts.kind,
          currency: accounts.currency,
          ownerMemberId: accounts.ownerMemberId,
        })
        .from(accounts)
        .where(
          and(
            eq(accounts.householdId, householdId),
            isNull(accounts.deletedAt),
          ),
        ),
      db
        .select({
          id: transactions.id,
          date: transactions.date,
          kind: transactions.kind,
          amountMinor: transactions.amountMinor,
          payeeId: transactions.payeeId,
          categoryId: transactions.categoryId,
          memberId: transactions.memberId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.householdId, householdId),
            isNull(transactions.deletedAt),
            eq(transactions.status, "posted"),
          ),
        )
        .orderBy(...newestFirst)
        .limit(transactionLimit),
      db
        .select({
          key: transactionTags.transactionId,
          value: transactionTags.tagId,
        })
        .from(transactionTags)
        .where(
          and(
            eq(transactionTags.householdId, householdId),
            inArray(transactionTags.transactionId, recentIds),
            isNull(transactionTags.deletedAt),
          ),
        ),
      db
        .select({ key: entries.transactionId, value: entries.accountId })
        .from(entries)
        .where(
          and(
            eq(entries.householdId, householdId),
            inArray(entries.transactionId, recentIds),
            isNull(entries.deletedAt),
          ),
        ),
    ]);
    const tagsOf = group(tagLinks);
    const accountsOf = group(entryLinks);

    return {
      baseCurrency: household.at(0)?.baseCurrency ?? "GBP",
      aliases: aliasRows,
      payees: payeeRows,
      categories: categoryRows,
      tags: tagRows,
      members: memberRows,
      accounts: accountRows,
      transactions: transactionRows.map((row): MemoryTransaction => ({
        ...row,
        tagIds: tagsOf.get(row.id) ?? [],
        accountIds: accountsOf.get(row.id) ?? [],
      })),
    };
  },
};
