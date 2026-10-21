import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import type { LabellingContext } from "../../ai/types.ts";
import {
  accounts,
  bankLinks,
  categories,
  households,
  members,
  payees,
  tags,
  transactions,
} from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

/** The most Payees the labeller sees by name; it finds the others with search. */
const MAX_PAYEES = 500;
/** The most Payees the labeller sees as examples of one Category. */
const MAX_USUAL_PAYEES = 5;

export const labellingContextRepository = {
  /** The Household's instructions, accounts, taxonomy, Members and Payees, for the labeller. */
  async load(scope: RepositoryScope): Promise<LabellingContext> {
    const { db, householdId } = scope;
    const lastUsed = db
      .select({
        payeeId: transactions.payeeId,
        lastUsedOn: sql<string>`max(${transactions.date})`.as("last_used_on"),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, householdId),
          isNull(transactions.deletedAt),
        ),
      )
      .groupBy(transactions.payeeId)
      .as("last_used");

    const household = (
      await db
        .select({
          baseCurrency: households.baseCurrency,
          instructions: households.aiInstructions,
        })
        .from(households)
        .where(eq(households.id, householdId))
    ).at(0);
    const accountRows = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        institution: accounts.institution,
        kind: accounts.kind,
        currency: accounts.currency,
        ownerMemberId: accounts.ownerMemberId,
        closedOn: accounts.closedOn,
        isSystem: accounts.isSystem,
        defaultPaymentAccountId: accounts.defaultPaymentAccountId,
        paymentDueDay: accounts.paymentDueDay,
        linkId: bankLinks.id,
      })
      .from(accounts)
      .leftJoin(
        bankLinks,
        and(
          eq(bankLinks.householdId, householdId),
          eq(bankLinks.accountId, accounts.id),
          isNull(bankLinks.deletedAt),
        ),
      )
      .where(
        and(eq(accounts.householdId, householdId), isNull(accounts.deletedAt)),
      )
      .orderBy(accounts.position, accounts.name);
    const categoryRows = await db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        kind: categories.kind,
        name: categories.name,
        isSystem: categories.isSystem,
      })
      .from(categories)
      .where(
        and(
          eq(categories.householdId, householdId),
          isNull(categories.deletedAt),
          isNull(categories.archivedAt),
        ),
      )
      .orderBy(categories.kind, categories.position, categories.name);
    const uses = sql<number>`count(*)::int`;
    const usualRows = await db
      .select({ categoryId: transactions.categoryId, name: payees.name })
      .from(transactions)
      .innerJoin(
        payees,
        and(
          eq(payees.householdId, householdId),
          eq(payees.id, transactions.payeeId),
        ),
      )
      .where(
        and(
          eq(transactions.householdId, householdId),
          isNull(transactions.deletedAt),
          eq(transactions.labelledBy, "member"),
          isNotNull(transactions.categoryId),
        ),
      )
      .groupBy(transactions.categoryId, payees.name)
      .orderBy(desc(uses), payees.name);
    const usualPayees = new Map<string, string[]>();
    for (const { categoryId, name } of usualRows) {
      if (categoryId === null) continue;
      const names = usualPayees.get(categoryId) ?? [];
      if (names.length < MAX_USUAL_PAYEES) names.push(name);
      usualPayees.set(categoryId, names);
    }
    const tagRows = await db
      .select({ id: tags.id, name: tags.name })
      .from(tags)
      .where(and(eq(tags.householdId, householdId), isNull(tags.deletedAt)))
      .orderBy(tags.position, tags.name);
    const memberRows = await db
      .select({ id: members.id, name: members.name })
      .from(members)
      .where(
        and(eq(members.householdId, householdId), isNull(members.deletedAt)),
      )
      .orderBy(members.createdAt);
    const payeeRows = await db
      .select({
        id: payees.id,
        name: payees.name,
        defaultCategoryId: payees.defaultCategoryId,
      })
      .from(payees)
      .leftJoin(lastUsed, eq(lastUsed.payeeId, payees.id))
      .where(
        and(
          eq(payees.householdId, householdId),
          isNull(payees.deletedAt),
          isNull(payees.mergedIntoId),
        ),
      )
      .orderBy(
        desc(sql`coalesce(${lastUsed.lastUsedOn}, '0001-01-01')`),
        payees.name,
      )
      .limit(MAX_PAYEES);

    return {
      baseCurrency: household?.baseCurrency ?? "GBP",
      instructions: household?.instructions ?? "",
      accounts: accountRows.map(({ closedOn, linkId, ...account }) => ({
        ...account,
        linked: linkId !== null,
        closed: closedOn !== null,
      })),
      categories: categoryRows.map((category) => ({
        ...category,
        usualPayees: usualPayees.get(category.id) ?? [],
      })),
      tags: tagRows,
      members: memberRows,
      payees: payeeRows,
    };
  },
};
