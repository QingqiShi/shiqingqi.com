import {
  and,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import {
  balanceSeriesToRows,
  computeBalanceDays,
  type EntryInput,
  type ValuationInput,
} from "../../domain/balance/compute-balance-days.ts";
import { addMonths } from "../../domain/dates/add-months.ts";
import {
  accountBalanceDays,
  entries,
  monthTotals,
  transactions,
  valuations,
} from "../schema.ts";
import type { FinanceDb } from "../types.ts";
import { accountRepository } from "./account-repository.ts";
import type { WriteScope } from "./types.ts";

/** What a write may have changed, so only those derived rows are worked out again. */
export interface DerivedChanges {
  /** Each account whose balances may have changed, with the first day that may have changed. */
  accounts: ReadonlyMap<string, string> | "all";
  /** The first day of each month whose totals may have changed. */
  months: ReadonlySet<string> | "all";
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

/**
 * The last Valuation day before `from` for each account: the stored balances
 * up to it cannot change, so the work starts there. Null means from the
 * account's first row.
 */
function anchorDays(
  fromByAccount: ReadonlyMap<string, string | null>,
  valuationsByAccount: ReadonlyMap<string, ValuationInput[]>,
) {
  const anchors = new Map<string, string | null>();
  for (const [accountId, from] of fromByAccount) {
    let anchor: string | null = null;
    if (from !== null) {
      for (const valuation of valuationsByAccount.get(accountId) ?? []) {
        if (valuation.on < from && (anchor === null || valuation.on > anchor)) {
          anchor = valuation.on;
        }
      }
    }
    anchors.set(accountId, anchor);
  }
  return anchors;
}

/** Selects the rows of these accounts on or after each account's anchor day. */
function sinceAnchor(
  accountColumn: typeof entries.accountId | typeof accountBalanceDays.accountId,
  dayColumn: typeof entries.date | typeof accountBalanceDays.day,
  anchors: ReadonlyMap<string, string | null>,
): SQL | undefined {
  const whole: string[] = [];
  const partial: SQL[] = [];
  for (const [accountId, anchor] of anchors) {
    if (anchor === null) whole.push(accountId);
    else {
      partial.push(
        sql`(${accountColumn} = ${accountId} and ${dayColumn} >= ${anchor})`,
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
  const fromByAccount = new Map<string, string | null>(
    everything
      ? (await accountRepository.listAllIds(scope)).map((id) => [id, null])
      : changed,
  );
  if (fromByAccount.size === 0) return 0;
  const accountIds = [...fromByAccount.keys()];

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
        everything ? undefined : inArray(valuations.accountId, accountIds),
      ),
    );
  const valuationsByAccount = new Map<string, ValuationInput[]>();
  for (const row of valuationRows)
    push(valuationsByAccount, row.accountId, row);
  const anchors = anchorDays(fromByAccount, valuationsByAccount);

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
          : sinceAnchor(entries.accountId, entries.date, anchors),
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
          : sinceAnchor(
              accountBalanceDays.accountId,
              accountBalanceDays.day,
              anchors,
            ),
      ),
    );
  const storedByAccount = new Map<string, typeof storedRows>();
  for (const row of storedRows) push(storedByAccount, row.accountId, row);

  const upserts: (typeof accountBalanceDays.$inferInsert)[] = [];
  const stale = new Map<string, string[]>();
  for (const [accountId, anchor] of anchors) {
    const accountValuations = (valuationsByAccount.get(accountId) ?? []).filter(
      (valuation) => anchor === null || valuation.on >= anchor,
    );
    const computed = balanceSeriesToRows(
      computeBalanceDays(
        accountValuations,
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

interface MonthTotal {
  month: string;
  kind: "expense" | "income" | "transfer";
  categoryId: string;
  memberId: string | null;
  amountMinor: number;
  count: number;
}

function monthTotalKey(row: Omit<MonthTotal, "amountMinor" | "count">) {
  return `${row.month}|${row.kind}|${row.categoryId}|${row.memberId ?? ""}`;
}

function sameMonthTotal(row: MonthTotal) {
  return and(
    eq(monthTotals.month, row.month),
    eq(monthTotals.kind, row.kind),
    eq(monthTotals.categoryId, row.categoryId),
    row.memberId === null
      ? isNull(monthTotals.memberId)
      : eq(monthTotals.memberId, row.memberId),
  );
}

async function recomputeMonthTotals(
  scope: WriteScope,
  changed: DerivedChanges["months"],
) {
  const everything = changed === "all";
  if (!everything && changed.size === 0) return 0;
  const months = everything ? [] : [...changed];

  const month = sql<string>`to_char(date_trunc('month', ${transactions.date}::timestamp), 'YYYY-MM-DD')`;
  const freshRows = await scope.db
    .select({
      month,
      kind: transactions.kind,
      categoryId: transactions.categoryId,
      memberId: transactions.memberId,
      amountMinor: sql`sum(${transactions.amountMinor})::bigint`.mapWith(
        Number,
      ),
      count: sql`count(*)::int`.mapWith(Number),
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, scope.householdId),
        eq(transactions.status, "posted"),
        isNull(transactions.deletedAt),
        isNotNull(transactions.categoryId),
        everything
          ? undefined
          : or(
              ...months.map((first) =>
                and(
                  gte(transactions.date, first),
                  lt(transactions.date, addMonths(first, 1)),
                ),
              ),
            ),
      ),
    )
    .groupBy(
      month,
      transactions.kind,
      transactions.categoryId,
      transactions.memberId,
    );

  const storedRows = await scope.db
    .select({
      month: monthTotals.month,
      kind: monthTotals.kind,
      categoryId: monthTotals.categoryId,
      memberId: monthTotals.memberId,
      amountMinor: monthTotals.amountMinor,
      count: monthTotals.count,
      deletedAt: monthTotals.deletedAt,
    })
    .from(monthTotals)
    .where(
      and(
        eq(monthTotals.householdId, scope.householdId),
        everything ? undefined : inArray(monthTotals.month, months),
      ),
    );
  const stored = new Map(storedRows.map((row) => [monthTotalKey(row), row]));

  const inserts: (typeof monthTotals.$inferInsert)[] = [];
  const updates: MonthTotal[] = [];
  for (const fresh of freshRows) {
    const { categoryId } = fresh;
    if (categoryId === null) continue;
    const row: MonthTotal = { ...fresh, categoryId };
    const key = monthTotalKey(row);
    const previous = stored.get(key);
    stored.delete(key);
    if (!previous) {
      inserts.push({
        ...row,
        householdId: scope.householdId,
        version: scope.version,
      });
    } else if (
      previous.deletedAt !== null ||
      previous.amountMinor !== row.amountMinor ||
      previous.count !== row.count
    ) {
      updates.push(row);
    }
  }

  for (const chunk of chunks(inserts)) {
    await scope.db.insert(monthTotals).values(chunk);
  }
  for (const row of updates) {
    await scope.db
      .update(monthTotals)
      .set({
        amountMinor: row.amountMinor,
        count: row.count,
        version: scope.version,
        deletedAt: null,
      })
      .where(
        and(
          eq(monthTotals.householdId, scope.householdId),
          sameMonthTotal(row),
        ),
      );
  }
  let staleCount = 0;
  for (const row of stored.values()) {
    if (row.deletedAt !== null) continue;
    staleCount++;
    await scope.db
      .update(monthTotals)
      .set({ deletedAt: sql`now()`, version: scope.version })
      .where(
        and(
          eq(monthTotals.householdId, scope.householdId),
          sameMonthTotal(row),
        ),
      );
  }
  return inserts.length + updates.length + staleCount;
}

/**
 * Brings `account_balance_days` and `month_totals` in step with the
 * Valuations, Entries and Transactions after a write. A derived row is never
 * removed: a stale one is soft-deleted so the removal reaches the Replica, and
 * only rows whose value changes get `version`. The importer passes `"all"` to
 * build every row in one pass.
 */
export async function recomputeDerived(
  db: FinanceDb,
  householdId: string,
  changes: DerivedChanges,
  version: number,
) {
  const scope: WriteScope = { db, householdId, version };
  const balanceDays = await recomputeBalanceDays(scope, changes.accounts);
  const totals = await recomputeMonthTotals(scope, changes.months);
  return { balanceDays, monthTotals: totals };
}
