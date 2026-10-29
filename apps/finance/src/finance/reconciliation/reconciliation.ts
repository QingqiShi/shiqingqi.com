import {
  and,
  eq,
  exists,
  gte,
  inArray,
  isNull,
  lte,
  notExists,
  or,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { toEntryAmount } from "../bank/to-entry-amount.ts";
import type { RepositoryScope, WriteScope } from "../db/repositories/types.ts";
import {
  bankLinks,
  bankTransactions,
  entries,
  rules,
  transactions,
} from "../db/schema.ts";
import { addDays } from "../domain/dates/add-days.ts";
import { occurrenceId } from "../rules/occurrence-id.ts";
import {
  ruleTemplateSchema,
  type RuleTemplate,
} from "../rules/rule-template-schema.ts";
import { mayAutoPost } from "./may-auto-post.ts";
import {
  MATCH_DAY_WINDOW,
  planBankMatches,
  type MatchCandidate,
} from "./plan-bank-matches.ts";

/** A Bank link as reconciliation needs it. */
export interface MatchLink {
  id: string;
  accountId: string;
  signMultiplier: number;
  /** The In transit account in the link's currency, when there is one. */
  inTransitAccountId: string | null;
}

/** A bank row that no Transaction stands for yet. */
export interface OpenBankRow {
  id: string;
  date: string;
  /** As the bank sent it, before the link's sign multiplier. */
  amountMinor: number;
}

/**
 * The Transaction that stands for a bank row: an Expected one to confirm, a
 * recorded one to link, or one whose In transit Entry the row settles.
 */
export type BankRowPair =
  | { action: "confirm"; transactionId: string; transactionDate: string }
  | { action: "link"; transactionId: string }
  | { action: "settle"; transactionId: string; entryId: string };

/**
 * The Transaction that stands for a day of a Rule: a Transaction of the
 * Rule, or a bank-backed one it may take. A Transaction the Rule made holds
 * the day its id names, so one that Bank sync moved to the bank row's date
 * still holds its first day. Another Transaction of the Rule, for example an
 * imported one, holds its date. A bank-backed Transaction with no Rule
 * holds a day within `MATCH_DAY_WINDOW` of its date, paired as a bank row
 * pairs with an Expected Transaction, and so does one the Rule took that way
 * before.
 */
export type OccurrenceHolder =
  | { kind: "rule"; transactionId: string }
  | { kind: "bank"; transactionId: string; ruleId: string | null };

/** The days on which a Transaction may stand for one of `days`. */
function windowAround(days: readonly string[]) {
  const sorted = [...days].sort();
  return {
    from: addDays(sorted[0], -MATCH_DAY_WINDOW),
    to: addDays(sorted[sorted.length - 1], MATCH_DAY_WINDOW),
  };
}

/**
 * Live Transactions with an Entry on the linked account in `range` that no
 * row of the link stands for yet. With an In transit account, also the
 * Transactions with an Entry on it and none on the linked account.
 */
async function findMatchCandidates(
  scope: RepositoryScope,
  link: MatchLink,
  range: { from: string; to: string },
) {
  const linked = alias(entries, "linked_entries");
  const rows = await scope.db
    .select({
      transactionId: transactions.id,
      entryId: entries.id,
      entryAccountId: entries.accountId,
      status: transactions.status,
      date: entries.date,
      transactionDate: transactions.date,
      amountMinor: entries.amountMinor,
      createdAt: transactions.createdAt,
    })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.householdId, scope.householdId),
        eq(transactions.householdId, scope.householdId),
        link.inTransitAccountId === null
          ? eq(entries.accountId, link.accountId)
          : or(
              eq(entries.accountId, link.accountId),
              and(
                eq(entries.accountId, link.inTransitAccountId),
                notExists(
                  scope.db
                    .select({ id: linked.id })
                    .from(linked)
                    .where(
                      and(
                        eq(linked.householdId, scope.householdId),
                        eq(linked.transactionId, transactions.id),
                        eq(linked.accountId, link.accountId),
                        isNull(linked.deletedAt),
                      ),
                    ),
                ),
              ),
            ),
        isNull(entries.deletedAt),
        isNull(transactions.deletedAt),
        gte(entries.date, range.from),
        lte(entries.date, range.to),
        notExists(
          scope.db
            .select({ id: bankTransactions.id })
            .from(bankTransactions)
            .where(
              and(
                eq(bankTransactions.householdId, scope.householdId),
                eq(bankTransactions.linkId, link.id),
                eq(bankTransactions.transactionId, transactions.id),
              ),
            ),
        ),
      ),
    );
  return rows.map(({ entryAccountId, ...row }) => ({
    ...row,
    inTransit: entryAccountId !== link.accountId,
  }));
}

/**
 * The Transaction that stands for each of the link's open bank rows, by
 * bank row id; a row without one is left out. A row pairs with a Transaction
 * of the same amount on the linked account, or on In transit, at most
 * `MATCH_DAY_WINDOW` days away, as `planBankMatches` chooses.
 */
async function pairBankRows(
  scope: RepositoryScope,
  link: MatchLink,
  rows: readonly OpenBankRow[],
) {
  const pairs = new Map<string, BankRowPair>();
  if (rows.length === 0) return pairs;
  const candidates = await findMatchCandidates(
    scope,
    link,
    windowAround(rows.map((row) => row.date)),
  );
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.transactionId, candidate]),
  );
  const plan = planBankMatches(
    rows.map((row) => ({
      date: row.date,
      amountMinor: toEntryAmount(row.amountMinor, link),
    })),
    candidates,
  );
  for (const [index, row] of rows.entries()) {
    const match = plan[index];
    if (match.action === "create") continue;
    const candidate = candidateById.get(match.transactionId);
    if (!candidate) continue;
    pairs.set(
      row.id,
      match.action === "confirm"
        ? { ...match, transactionDate: candidate.transactionDate }
        : match,
    );
  }
  return pairs;
}

/**
 * The Transaction of the Rule, live or deleted, that holds each of `days`.
 * A deleted one holds its day too, so a skipped occurrence stays skipped.
 */
async function ruleHolders(
  scope: RepositoryScope,
  ruleId: string,
  days: readonly string[],
) {
  const dayById = new Map(days.map((day) => [occurrenceId(ruleId, day), day]));
  const rows = await scope.db
    .select({ id: transactions.id, date: transactions.date })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, scope.householdId),
        eq(transactions.ruleId, ruleId),
        or(
          inArray(transactions.date, [...days]),
          inArray(transactions.id, [...dayById.keys()]),
        ),
      ),
    );
  const holders = new Map<string, OccurrenceHolder>();
  for (const row of rows) {
    const day = dayById.get(row.id) ?? row.date;
    if (!holders.has(day)) {
      holders.set(day, { kind: "rule", transactionId: row.id });
    }
  }
  return { holders, ids: new Set(rows.map((row) => row.id)) };
}

/**
 * Live Transactions that a bank row backs: each has a live Entry in `range`
 * with one of the template's accounts and amounts, and a bank row of a Bank
 * link on that account. One row per Transaction, at its earliest such Entry.
 */
async function findBankBacked(
  scope: RepositoryScope,
  templateEntries: RuleTemplate["entries"],
  range: { from: string; to: string },
) {
  if (templateEntries.length === 0) return [];
  const rows = await scope.db
    .select({
      transactionId: transactions.id,
      entryId: entries.id,
      ruleId: transactions.ruleId,
      source: transactions.source,
      status: transactions.status,
      date: entries.date,
      createdAt: transactions.createdAt,
    })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.householdId, scope.householdId),
        eq(transactions.householdId, scope.householdId),
        isNull(entries.deletedAt),
        isNull(transactions.deletedAt),
        or(
          ...templateEntries.map((entry) =>
            and(
              eq(entries.accountId, entry.accountId),
              eq(entries.amountMinor, entry.amountMinor),
            ),
          ),
        ),
        gte(entries.date, range.from),
        lte(entries.date, range.to),
        exists(
          scope.db
            .select({ id: bankTransactions.id })
            .from(bankTransactions)
            .innerJoin(bankLinks, eq(bankLinks.id, bankTransactions.linkId))
            .where(
              and(
                eq(bankTransactions.householdId, scope.householdId),
                eq(bankLinks.householdId, scope.householdId),
                eq(bankTransactions.transactionId, transactions.id),
                eq(bankLinks.accountId, entries.accountId),
              ),
            ),
        ),
      ),
    )
    .orderBy(entries.date, entries.id);
  const seen = new Set<string>();
  return rows.filter((row) => {
    if (seen.has(row.transactionId)) return false;
    seen.add(row.transactionId);
    return true;
  });
}

/** The bank-backed Transaction that holds each of `days`, none of them in `taken`. */
async function bankHolders(
  scope: RepositoryScope,
  rule: { id: string; template: RuleTemplate },
  days: readonly string[],
  taken: ReadonlySet<string>,
) {
  const holders = new Map<string, OccurrenceHolder>();
  if (days.length === 0) return holders;
  const candidates = (
    await findBankBacked(scope, rule.template.entries, windowAround(days))
  ).filter(
    (candidate) =>
      !taken.has(candidate.transactionId) &&
      (candidate.ruleId === null ||
        (candidate.ruleId === rule.id && candidate.source !== "rule")),
  );
  const candidateById = new Map(
    candidates.map((candidate) => [candidate.transactionId, candidate]),
  );
  // Each candidate has an amount of the template already. Thus all days and
  // candidates get the same amount, and the plan pairs them by date only.
  const plan = planBankMatches(
    days.map((date) => ({ date, amountMinor: 0 })),
    candidates.map((candidate): MatchCandidate => ({
      ...candidate,
      amountMinor: 0,
      inTransit: false,
    })),
  );
  for (const [index, day] of days.entries()) {
    const match = plan[index];
    if (match.action === "create") continue;
    const candidate = candidateById.get(match.transactionId);
    if (candidate) {
      holders.set(day, {
        kind: "bank",
        transactionId: candidate.transactionId,
        ruleId: candidate.ruleId,
      });
    }
  }
  return holders;
}

/** What holds each of `days` of the Rule, by day; a day without a holder is free. */
async function occurrenceHolders(
  scope: RepositoryScope,
  rule: { id: string; template: RuleTemplate },
  days: readonly string[],
): Promise<Map<string, OccurrenceHolder>> {
  const byRule = await ruleHolders(scope, rule.id, days);
  const byBank = await bankHolders(
    scope,
    rule,
    days.filter((day) => !byRule.holders.has(day)),
    byRule.ids,
  );
  return new Map([...byRule.holders, ...byBank]);
}

/** The ids among `transactionIds` that a bank row stands for. */
async function bankBackedIds(
  scope: RepositoryScope,
  transactionIds: readonly string[],
) {
  if (transactionIds.length === 0) return new Set<string>();
  const rows = await scope.db
    .select({ transactionId: bankTransactions.transactionId })
    .from(bankTransactions)
    .where(
      and(
        eq(bankTransactions.householdId, scope.householdId),
        inArray(bankTransactions.transactionId, [...transactionIds]),
      ),
    );
  return new Set(rows.flatMap((row) => row.transactionId ?? []));
}

const templateEntriesSchema = ruleTemplateSchema.pick({ entries: true });

/** Stops each Rule that `mayAutoPost` refuses once the account has a Bank link from posting automatically. */
async function onAccountLinked(scope: WriteScope, accountId: string) {
  const autoPosting = await scope.db
    .select({ id: rules.id, template: rules.template })
    .from(rules)
    .where(
      and(eq(rules.householdId, scope.householdId), eq(rules.autoPost, true)),
    );
  const refused = autoPosting.flatMap((rule) => {
    const parsed = templateEntriesSchema.safeParse(rule.template);
    return parsed.success &&
      !mayAutoPost(parsed.data.entries, (id) => id === accountId)
      ? [rule.id]
      : [];
  });
  if (refused.length === 0) return;
  await scope.db
    .update(rules)
    .set({ autoPost: false, version: scope.version, updatedAt: sql`now()` })
    .where(
      and(eq(rules.householdId, scope.householdId), inArray(rules.id, refused)),
    );
}

/**
 * Which Transaction stands for each bank row and each Rule occurrence, and
 * the Rules that may post automatically because no bank row will stand for
 * their Transactions.
 */
export const reconciliation = {
  pairBankRows,
  occurrenceHolders,
  bankBackedIds,
  onAccountLinked,
};
