import { and, asc, eq, inArray, lte, max, sql } from "drizzle-orm";
import { balanceCheckDays } from "../schema.ts";
import type { RepositoryScope } from "./types.ts";

/** The first wrong stored balance of an account among the checked days. */
export interface BalanceDrift {
  accountId: string;
  /** The first checked day whose stored balance is wrong or missing, or should not be there. */
  day: string;
  /** The balance on `day` from the stored balance before it, the Valuation and the Entries; null when no row should be stored on `day`. */
  expectedMinor: number | null;
  /** The live stored balance on `day`; null when none is stored. */
  storedMinor: number | null;
  /** How many checked days of the account are wrong. */
  wrongDays: number;
}

/** The newest queued id of the Household, or 0 when the queue is empty. */
async function latestId(scope: RepositoryScope) {
  const rows = await scope.db
    .select({ id: max(balanceCheckDays.id) })
    .from(balanceCheckDays)
    .where(eq(balanceCheckDays.householdId, scope.householdId));
  return rows.at(0)?.id ?? 0;
}

/** The oldest `limit` queued ids up to `upToId`. */
async function nextIds(scope: RepositoryScope, upToId: number, limit: number) {
  const rows = await scope.db
    .select({ id: balanceCheckDays.id })
    .from(balanceCheckDays)
    .where(
      and(
        eq(balanceCheckDays.householdId, scope.householdId),
        lte(balanceCheckDays.id, upToId),
      ),
    )
    .orderBy(asc(balanceCheckDays.id))
    .limit(limit);
  return rows.map((row) => row.id);
}

/**
 * Checks each queued account day, and the next stored day after it, against
 * the rule of `computeBalanceDays` one day at a time: the stored balance is
 * the Valuation on that day, or else the stored balance before it (0 when
 * none) plus that day's posted Entries; a day with neither has no stored
 * row. Every read is an index lookup, so the cost follows the queue, not the
 * history.
 */
async function findDrift(
  scope: RepositoryScope,
  ids: readonly number[],
): Promise<BalanceDrift[]> {
  if (ids.length === 0) return [];
  const household = scope.householdId;
  const queued = sql`(
    select distinct account_id, day
    from balance_check_days
    where household_id = ${household}
      and ${inArray(balanceCheckDays.id, [...ids])}
  )`;
  const candidates = sql`(
    select account_id, day from ${queued} as queued
    union
    select queued.account_id, next.day
    from ${queued} as queued
    cross join lateral (
      select b.day from account_balance_days b
      where b.household_id = ${household} and b.account_id = queued.account_id
        and b.day > queued.day and b.deleted_at is null
      order by b.day
      limit 1
    ) as next
  )`;
  const checked = sql`(
    select c.account_id, c.day, stored.balance_minor as stored,
      case
        when valuation.amount_minor is not null then valuation.amount_minor
        when posted.count > 0 then coalesce((
          select b.balance_minor from account_balance_days b
          where b.household_id = ${household} and b.account_id = c.account_id
            and b.day < c.day and b.deleted_at is null
          order by b.day desc
          limit 1
        ), 0) + posted.total
      end as expected
    from ${candidates} as c
    left join account_balance_days stored
      on stored.household_id = ${household}
      and stored.account_id = c.account_id and stored.day = c.day
      and stored.deleted_at is null
    left join valuations valuation
      on valuation.household_id = ${household}
      and valuation.account_id = c.account_id and valuation."on" = c.day
      and valuation.deleted_at is null
    cross join lateral (
      select count(*) as count, sum(e.amount_minor) as total
      from entries e
      join transactions t on t.id = e.transaction_id
      where e.household_id = ${household} and t.household_id = ${household}
        and e.account_id = c.account_id and e.date = c.day
        and e.deleted_at is null and t.deleted_at is null
        and t.status = 'posted'
    ) as posted
  )`;
  const wrong = sql`(
    select distinct on (account_id) account_id, day, expected, stored,
      count(*) over (partition by account_id) as wrong_days
    from ${checked} as checked
    where expected is distinct from stored
    order by account_id, day
  ) as wrong`;
  return scope.db
    .select({
      accountId: sql<string>`account_id`,
      day: sql<string>`day::text`,
      expectedMinor: sql<number | null>`expected::bigint`.mapWith(Number),
      storedMinor: sql<number | null>`stored`.mapWith(Number),
      wrongDays: sql<number>`wrong_days::int`.mapWith(Number),
    })
    .from(wrong)
    .orderBy(sql`account_id`);
}

async function remove(scope: RepositoryScope, ids: readonly number[]) {
  if (ids.length === 0) return;
  await scope.db
    .delete(balanceCheckDays)
    .where(
      and(
        eq(balanceCheckDays.householdId, scope.householdId),
        inArray(balanceCheckDays.id, [...ids]),
      ),
    );
}

export const balanceCheckRepository = { latestId, nextIds, findDrift, remove };
