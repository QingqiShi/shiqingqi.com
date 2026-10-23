import { and, desc, eq, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import {
  balanceSeriesToRows,
  computeBalanceDays,
  type EntryInput,
  type ValuationInput,
} from "../../domain/balance/compute-balance-days.ts";
import {
  accountBalanceDays,
  entries,
  transactions,
  valuations,
} from "../schema.ts";
import { accountRepository } from "./account-repository.ts";
import type { WriteScope } from "./types.ts";

/** What a write may have changed, so only those derived rows are worked out again. */
export interface DerivedChanges {
  /** Each account whose balances may have changed, with the first day that may have changed. */
  accounts: ReadonlyMap<string, string> | "all";
}

const WRITE_CHUNK = 2000;

function chunks<T>(items: readonly T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += WRITE_CHUNK) {
    result.push(items.slice(i, i + WRITE_CHUNK));
  }
  return result;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/** The stored balance an account's recompute starts from. */
interface Seed {
  day: string;
  balanceMinor: number;
}

/**
 * The last live stored balance before each account's first changed day: the
 * stored balances up to it cannot change, so the work starts there. Null
 * means from the account's first row.
 */
async function seedDays(
  scope: WriteScope,
  fromByAccount: ReadonlyMap<string, string>,
) {
  const seeds = new Map<string, Seed | null>(
    [...fromByAccount.keys()].map((accountId) => [accountId, null]),
  );
  if (fromByAccount.size === 0) return seeds;
  const latest = scope.db
    .select({
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
    })
    .from(accountBalanceDays)
    .where(
      and(
        eq(accountBalanceDays.householdId, scope.householdId),
        sql`${accountBalanceDays.accountId} = changed.account_id`,
        sql`${accountBalanceDays.day} < changed.from_day`,
        isNull(accountBalanceDays.deletedAt),
      ),
    )
    .orderBy(desc(accountBalanceDays.day))
    .limit(1)
    .as("latest");
  const changed = sql.join(
    [...fromByAccount].map(
      ([accountId, from]) => sql`(${accountId}::uuid, ${from}::date)`,
    ),
    sql`, `,
  );
  const rows = await scope.db
    .select({
      accountId: sql<string>`changed.account_id`,
      day: latest.day,
      balanceMinor: latest.balanceMinor,
    })
    .from(sql`(values ${changed}) as changed(account_id, from_day)`)
    .innerJoinLateral(latest, sql`true`);
  for (const row of rows) {
    seeds.set(row.accountId, { day: row.day, balanceMinor: row.balanceMinor });
  }
  return seeds;
}

/** Selects the rows of these accounts on or after each account's seed day. */
function sinceSeed(
  accountColumn: PgColumn,
  dayColumn: PgColumn,
  seeds: ReadonlyMap<string, Seed | null>,
): SQL | undefined {
  const whole: string[] = [];
  const partial: SQL[] = [];
  for (const [accountId, seed] of seeds) {
    if (seed === null) whole.push(accountId);
    else {
      partial.push(
        sql`(${accountColumn} = ${accountId} and ${dayColumn} >= ${seed.day})`,
      );
    }
  }
  return or(
    whole.length > 0 ? inArray(accountColumn, whole) : undefined,
    ...partial,
  );
}

async function recomputeBalanceDays(
  scope: WriteScope,
  changed: DerivedChanges["accounts"],
) {
  const everything = changed === "all";
  const seeds = everything
    ? new Map<string, Seed | null>(
        (await accountRepository.listAllIds(scope)).map((id) => [id, null]),
      )
    : await seedDays(scope, changed);
  if (seeds.size === 0) return 0;

  const valuationRows = await scope.db
    .select({
      accountId: valuations.accountId,
      on: valuations.on,
      amountMinor: valuations.amountMinor,
    })
    .from(valuations)
    .where(
      and(
        eq(valuations.householdId, scope.householdId),
        isNull(valuations.deletedAt),
        everything
          ? undefined
          : sinceSeed(valuations.accountId, valuations.on, seeds),
      ),
    );
  const valuationsByAccount = new Map<string, ValuationInput[]>();
  for (const row of valuationRows)
    push(valuationsByAccount, row.accountId, row);

  const entryRows = await scope.db
    .select({
      accountId: entries.accountId,
      date: entries.date,
      amountMinor: entries.amountMinor,
    })
    .from(entries)
    .innerJoin(transactions, eq(transactions.id, entries.transactionId))
    .where(
      and(
        eq(entries.householdId, scope.householdId),
        eq(transactions.householdId, scope.householdId),
        isNull(entries.deletedAt),
        isNull(transactions.deletedAt),
        eq(transactions.status, "posted"),
        everything
          ? undefined
          : sinceSeed(entries.accountId, entries.date, seeds),
      ),
    );
  const entriesByAccount = new Map<string, EntryInput[]>();
  for (const row of entryRows) push(entriesByAccount, row.accountId, row);

  const storedRows = await scope.db
    .select({
      accountId: accountBalanceDays.accountId,
      day: accountBalanceDays.day,
      balanceMinor: accountBalanceDays.balanceMinor,
      deletedAt: accountBalanceDays.deletedAt,
    })
    .from(accountBalanceDays)
    .where(
      and(
        eq(accountBalanceDays.householdId, scope.householdId),
        everything
          ? undefined
          : sinceSeed(
              accountBalanceDays.accountId,
              accountBalanceDays.day,
              seeds,
            ),
      ),
    );
  const storedByAccount = new Map<string, typeof storedRows>();
  for (const row of storedRows) push(storedByAccount, row.accountId, row);

  const upserts: (typeof accountBalanceDays.$inferInsert)[] = [];
  const stale = new Map<string, string[]>();
  for (const [accountId, seed] of seeds) {
    const accountValuations = valuationsByAccount.get(accountId) ?? [];
    const computed = balanceSeriesToRows(
      computeBalanceDays(
        seed
          ? [
              { on: seed.day, amountMinor: seed.balanceMinor },
              ...accountValuations,
            ]
          : accountValuations,
        entriesByAccount.get(accountId) ?? [],
      ),
    );
    const stored = new Map(
      (storedByAccount.get(accountId) ?? []).map((row) => [row.day, row]),
    );
    for (const row of computed) {
      const previous = stored.get(row.day);
      stored.delete(row.day);
      if (
        previous &&
        previous.deletedAt === null &&
        previous.balanceMinor === row.balanceMinor
      ) {
        continue;
      }
      upserts.push({
        householdId: scope.householdId,
        accountId,
        day: row.day,
        balanceMinor: row.balanceMinor,
        version: scope.version,
      });
    }
    for (const row of stored.values()) {
      if (row.deletedAt === null) push(stale, accountId, row.day);
    }
  }

  for (const chunk of chunks(upserts)) {
    await scope.db
      .insert(accountBalanceDays)
      .values(chunk)
      .onConflictDoUpdate({
        target: [accountBalanceDays.accountId, accountBalanceDays.day],
        set: {
          balanceMinor: sql`excluded.balance_minor`,
          version: scope.version,
          deletedAt: null,
        },
      });
  }
  let staleCount = 0;
  for (const [accountId, days] of stale) {
    staleCount += days.length;
    for (const chunk of chunks(days)) {
      await scope.db
        .update(accountBalanceDays)
        .set({ deletedAt: sql`now()`, version: scope.version })
        .where(
          and(
            eq(accountBalanceDays.householdId, scope.householdId),
            eq(accountBalanceDays.accountId, accountId),
            inArray(accountBalanceDays.day, chunk),
          ),
        );
    }
  }
  return upserts.length + staleCount;
}

/**
 * Brings `account_balance_days` in step with the Valuations, Entries and
 * Transactions after a write. A derived row is never
 * removed: a stale one is soft-deleted so the removal reaches the Replica, and
 * only rows whose value changes get `version`. The importer passes `"all"` to
 * build every row in one pass.
 */
export async function recomputeDerived(
  scope: WriteScope,
  changes: DerivedChanges,
) {
  const balanceDays = await recomputeBalanceDays(scope, changes.accounts);
  return { balanceDays };
}
