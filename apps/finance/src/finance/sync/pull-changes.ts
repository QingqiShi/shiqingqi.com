import { householdRepository } from "../db/repositories/household-repository.ts";
import { syncReadRepository } from "../db/repositories/sync-read-repository.ts";
import type { RepositoryScope } from "../db/repositories/types.ts";
import { setStatementTimeout } from "../db/set-statement-timeout.ts";
import type { FinanceDb } from "../db/types.ts";
import { withHousehold } from "../db/with-household.ts";
import {
  findHouseholdPairs,
  householdPairsId,
} from "../exchange-rates/find-household-pairs.ts";
import { SYNC_TABLE_NAMES, type SyncTableName } from "./row-schemas.ts";

/** Rows as the database returns them; JSON turns their timestamps into the wire's ISO strings. */
type ServerSyncTables = Partial<Record<SyncTableName, object[]>>;

/**
 * Runs `read` on one consistent snapshot, so the clock it reads matches the
 * rows: a batch that commits during the read is either wholly in or wholly
 * out.
 */
export function readSnapshot<T>(
  db: FinanceDb,
  householdId: string,
  read: (scope: RepositoryScope) => Promise<T>,
) {
  return withHousehold(
    db,
    householdId,
    async (scope) => {
      await setStatementTimeout(scope.db);
      return read(scope);
    },
    { isolationLevel: "repeatable read", accessMode: "read only" },
  );
}

export function readTable(
  scope: RepositoryScope,
  table: SyncTableName,
  since: number | null,
): Promise<object[]> {
  return syncReadRepository.tables[table](scope, since);
}

/**
 * Every synced row of the Household with a version above `since`, and the
 * clock they reach. With rows, also the id of the pairs the Household needs
 * rates for.
 */
export async function pullChanges(
  db: FinanceDb,
  householdId: string,
  since: number,
) {
  return readSnapshot(db, householdId, async (scope) => {
    const household = await householdRepository.find(scope);
    if (!household) throw new Error("Household not found");
    const tables: ServerSyncTables = {};
    if (since >= household.clock) {
      return { clock: household.clock, household, tables };
    }
    for (const table of SYNC_TABLE_NAMES) {
      const rows = await readTable(scope, table, since);
      if (rows.length > 0) tables[table] = rows;
    }
    const pairs = await findHouseholdPairs(scope, household.baseCurrency);
    return {
      clock: household.clock,
      household,
      tables,
      exchangeRatePairsId: householdPairsId(pairs),
    };
  });
}
